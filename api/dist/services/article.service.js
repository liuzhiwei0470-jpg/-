import { RssService } from './rss.service';
import { getRow, runSql } from '../models/database';
const rssService = new RssService();
async function getArticleContent(articleId) {
    const article = await getRow('SELECT * FROM articles WHERE id = ?', articleId);
    return article || null;
}
async function verifyOwnership(articleId, userId) {
    const article = await getRow(`
    SELECT a.id FROM articles a
    JOIN subscriptions s ON a.subscription_id = s.id
    WHERE a.id = ? AND s.user_id = ?
  `, articleId, userId);
    return !!article;
}
async function extractFullContent(articleId, userId) {
    if (!(await verifyOwnership(articleId, userId))) {
        return { success: false, error: '文章不存在' };
    }
    const article = await getArticleContent(articleId);
    if (!article) {
        return { success: false, error: '文章不存在' };
    }
    try {
        const { Readability } = await import('@mozilla/readability');
        const { JSDOM } = await import('jsdom');
        const Turndown = (await import('turndown')).default;
        console.log(`[全文提取] 开始提取文章 ${articleId}: ${article.link}`);
        if (article.link) {
            try {
                const webResult = await extractFromWebsite(article.link, Readability, JSDOM, Turndown);
                if (webResult.success && webResult.content) {
                    await runSql('UPDATE articles SET full_content = ? WHERE id = ?', webResult.content, articleId);
                    console.log(`[全文提取] 原网站提取成功，长度: ${webResult.content.length}`);
                    return { success: true, content: webResult.content, source: 'web' };
                }
                console.log(`[全文提取] 原网站提取失败: ${webResult.error}，尝试使用 RSS 内容`);
            }
            catch (e) {
                console.log(`[全文提取] 原网站提取异常: ${e.message}，尝试使用 RSS 内容`);
            }
        }
        if (article.content && article.content.length > 200) {
            console.log(`[全文提取] 使用 RSS 内容作为全文，原始长度: ${article.content.length}`);
            const dom = new JSDOM(article.content, { url: article.link || undefined });
            const reader = new Readability(dom.window.document, {
                charThreshold: 50,
            });
            const parsed = reader.parse();
            let htmlContent = article.content;
            if (parsed && parsed.content && parsed.content.length > 100) {
                htmlContent = parsed.content;
            }
            const turndown = new Turndown({
                headingStyle: 'atx',
                codeBlockStyle: 'fenced',
                bulletListMarker: '-',
                emDelimiter: '*',
                strongDelimiter: '**',
            });
            turndown.addRule('images', {
                filter: 'img',
                replacement: function (content, node) {
                    const alt = node.getAttribute('alt') || '';
                    const src = node.getAttribute('src') || '';
                    const title = node.getAttribute('title') || '';
                    return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
                }
            });
            turndown.addRule('strikethrough', {
                filter: ['del', 's', 'strike'],
                replacement: (content) => `~~${content}~~`,
            });
            turndown.addRule('codeBlock', {
                filter: function (node) {
                    return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
                },
                replacement: function (content, node) {
                    const codeNode = node.firstChild;
                    const className = codeNode.getAttribute('class') || '';
                    const langMatch = className.match(/language-(\w+)/);
                    const lang = langMatch ? langMatch[1] : '';
                    return '\n```' + lang + '\n' + codeNode.textContent + '\n```\n';
                }
            });
            const fullContent = turndown.turndown(htmlContent);
            await runSql('UPDATE articles SET full_content = ? WHERE id = ?', fullContent, articleId);
            console.log(`[全文提取] RSS 内容转换完成，Markdown 长度: ${fullContent.length}`);
            return { success: true, content: fullContent, source: 'rss' };
        }
        console.log(`[全文提取] 所有提取方式都失败`);
        return { success: false, error: '无法提取正文内容，该网站可能有反爬机制或 RSS 内容过短' };
    }
    catch (error) {
        console.error(`[全文提取] 失败 (文章 ${articleId}):`, error.message);
        return { success: false, error: error.message || '提取失败' };
    }
}
async function extractFromWebsite(link, Readability, JSDOM, Turndown) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    try {
        const response = await fetch(link, {
            headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                'Referer': new URL(link).origin + '/',
            },
            signal: controller.signal,
        });
        clearTimeout(timeoutId);
        if (!response.ok) {
            return { success: false, error: `HTTP ${response.status}` };
        }
        const buffer = Buffer.from(await response.arrayBuffer());
        const contentType = response.headers.get('content-type') || '';
        let html;
        let charset = 'utf-8';
        const charsetMatch = contentType.match(/charset=([\w-]+)/i);
        if (charsetMatch) {
            charset = charsetMatch[1].toLowerCase();
        }
        else {
            const metaMatch = buffer.toString('utf-8', 0, 2048).match(/<meta[^>]+charset=["']?([\w-]+)/i);
            if (metaMatch) {
                charset = metaMatch[1].toLowerCase();
            }
        }
        if (charset === 'utf-8' || charset === 'utf8') {
            html = buffer.toString('utf-8');
        }
        else {
            try {
                const iconv = await import('iconv-lite');
                html = iconv.default.decode(buffer, charset);
            }
            catch {
                try {
                    const decoder = new TextDecoder(charset);
                    html = decoder.decode(buffer);
                }
                catch {
                    html = buffer.toString('utf-8');
                }
            }
        }
        const dom = new JSDOM(html, { url: link });
        const reader = new Readability(dom.window.document, {
            charThreshold: 100,
        });
        const articleResult = reader.parse();
        let extractedHtml = '';
        if (articleResult && articleResult.content && articleResult.content.length > 200) {
            extractedHtml = articleResult.content;
            console.log(`[全文提取] Readability 提取成功, 长度: ${extractedHtml.length}`);
        }
        else {
            const doc = dom.window.document;
            const selectors = [
                'article',
                'main',
                '.article-content',
                '.post-content',
                '.entry-content',
                '#content',
                '.content',
            ];
            for (const selector of selectors) {
                const el = doc.querySelector(selector);
                if (el && el.textContent && el.textContent.trim().length > 200) {
                    extractedHtml = el.innerHTML;
                    console.log(`[全文提取] Fallback 提取成功 (${selector}), 长度: ${extractedHtml.length}`);
                    break;
                }
            }
            if (!extractedHtml) {
                return { success: false, error: '无法提取正文内容' };
            }
        }
        const turndown = new Turndown({
            headingStyle: 'atx',
            codeBlockStyle: 'fenced',
            bulletListMarker: '-',
            emDelimiter: '*',
            strongDelimiter: '**',
        });
        turndown.addRule('images', {
            filter: 'img',
            replacement: function (content, node) {
                const alt = node.getAttribute('alt') || '';
                const src = node.getAttribute('src') || '';
                const title = node.getAttribute('title') || '';
                return title ? `![${alt}](${src} "${title}")` : `![${alt}](${src})`;
            }
        });
        turndown.addRule('strikethrough', {
            filter: ['del', 's', 'strike'],
            replacement: (content) => `~~${content}~~`,
        });
        turndown.addRule('codeBlock', {
            filter: function (node) {
                return node.nodeName === 'PRE' && node.firstChild && node.firstChild.nodeName === 'CODE';
            },
            replacement: function (content, node) {
                const codeNode = node.firstChild;
                const className = codeNode.getAttribute('class') || '';
                const langMatch = className.match(/language-(\w+)/);
                const lang = langMatch ? langMatch[1] : '';
                return '\n```' + lang + '\n' + codeNode.textContent + '\n```\n';
            }
        });
        const fullContent = turndown.turndown(extractedHtml);
        return { success: true, content: fullContent };
    }
    catch (error) {
        clearTimeout(timeoutId);
        if (error.name === 'AbortError') {
            return { success: false, error: '超时（30秒）' };
        }
        return { success: false, error: error.message };
    }
}
async function generateDownload(articleId, userId, format) {
    if (!(await verifyOwnership(articleId, userId))) {
        return { success: false, error: '文章不存在' };
    }
    const article = await getArticleContent(articleId);
    if (!article) {
        return { success: false, error: '文章不存在' };
    }
    const title = article.title || '无标题';
    const author = article.author || '未知作者';
    const published = article.published ? new Date(article.published).toLocaleString('zh-CN') : '未知日期';
    const link = article.link || '';
    let content = article.content;
    if (!content && article.content_snippet) {
        content = article.content_snippet;
    }
    if (!content) {
        content = '（无内容）';
    }
    if (format === 'md') {
        const md = `# ${title}\n\n**作者:** ${author}  \n**发布日期:** ${published}  \n**原文链接:** ${link}\n\n---\n\n${content}\n\n---\n\n*由个人情报官导出*`;
        const filename = `${title.replace(/[\\/:*?"<>|]/g, '_')}.md`;
        return { success: true, content: md, filename, contentType: 'text/markdown; charset=utf-8' };
    }
    else if (format === 'html') {
        const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
      line-height: 1.8;
      color: #333;
    }
    h1 { font-size: 1.8em; margin-bottom: 0.5em; }
    .meta { color: #666; margin-bottom: 2em; padding-bottom: 1em; border-bottom: 1px solid #eee; }
    .meta span { margin-right: 1em; }
    img { max-width: 100%; height: auto; }
    pre { background: #f6f8fa; padding: 16px; border-radius: 6px; overflow-x: auto; }
    code { background: #f6f8fa; padding: 2px 6px; border-radius: 3px; }
    blockquote { border-left: 4px solid #ddd; margin-left: 0; padding-left: 1em; color: #666; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">
    <span>作者: ${author}</span>
    <span>发布日期: ${published}</span>
  </div>
  ${content}
  <hr>
  <p><small>原文链接: <a href="${link}">${link}</a></small></p>
  <p><small>由个人情报官导出</small></p>
</body>
</html>`;
        const filename = `${title.replace(/[\\/:*?"<>|]/g, '_')}.html`;
        return { success: true, content: html, filename, contentType: 'text/html; charset=utf-8' };
    }
    else {
        try {
            const { JSDOM } = await import('jsdom');
            const { Document, Packer, Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, LevelFormat, convertInchesToTwip, ImageType, } = await import('docx');
            const children = [];
            children.push(new Paragraph({
                text: title,
                heading: HeadingLevel.TITLE,
                spacing: { after: 200 },
            }));
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `作者: ${author}`, size: 20, color: '666666' }),
                    new TextRun({ text: '    ', size: 20 }),
                    new TextRun({ text: `发布日期: ${published}`, size: 20, color: '666666' }),
                ],
                spacing: { after: 100 },
            }));
            if (link) {
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: `原文链接: ${link}`, size: 20, color: '666666' }),
                    ],
                    spacing: { after: 400 },
                }));
            }
            children.push(new Paragraph({
                border: {
                    bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                },
                spacing: { after: 400 },
            }));
            const dom = new JSDOM(`<div>${content}</div>`);
            const parsedDoc = dom.window.document.querySelector('div');
            const imageMap = new Map();
            const imgTags = parsedDoc.querySelectorAll('img');
            for (const img of imgTags) {
                const src = img.getAttribute('src');
                if (src && !imageMap.has(src)) {
                    try {
                        let fullUrl = src;
                        if (src.startsWith('//')) {
                            fullUrl = 'https:' + src;
                        }
                        else if (src.startsWith('/')) {
                            const articleUrl = new URL(link);
                            fullUrl = articleUrl.origin + src;
                        }
                        else if (!src.startsWith('http://') && !src.startsWith('https://')) {
                            const articleUrl = new URL(link);
                            fullUrl = articleUrl.origin + '/' + src;
                        }
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), 15000);
                        const response = await fetch(fullUrl, {
                            signal: controller.signal,
                            headers: {
                                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                                'Referer': link,
                            },
                        });
                        clearTimeout(timeoutId);
                        if (response.ok) {
                            const buffer = await response.arrayBuffer();
                            const base64 = Buffer.from(buffer).toString('base64');
                            const contentType = response.headers.get('content-type') || 'image/png';
                            imageMap.set(src, `data:${contentType};base64,${base64}`);
                            console.log(`[图片下载] 成功: ${src.substring(0, 50)}... (${buffer.byteLength} bytes)`);
                        }
                        else {
                            console.log(`[图片下载] 失败: ${src.substring(0, 50)}... HTTP ${response.status}`);
                        }
                    }
                    catch (e) {
                        console.log(`[图片下载] 异常: ${src.substring(0, 50)}... ${e.message}`);
                    }
                }
            }
            console.log(`[图片下载] 共处理 ${imageMap.size} 张图片`);
            const docxLib = {
                Paragraph,
                TextRun,
                HeadingLevel,
                ImageRun,
                Table,
                TableRow,
                TableCell,
                BorderStyle,
                WidthType,
                AlignmentType,
            };
            const contentElements = htmlToDocx(parsedDoc, docxLib, imageMap);
            children.push(...contentElements);
            children.push(new Paragraph({
                border: {
                    top: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' },
                },
                spacing: { before: 400, after: 200 },
            }));
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: '由个人情报官导出', size: 18, color: '999999', italics: true }),
                ],
                alignment: AlignmentType.CENTER,
            }));
            const doc = new Document({
                sections: [{
                        properties: {
                            page: {
                                margin: {
                                    top: convertInchesToTwip(1),
                                    right: convertInchesToTwip(1),
                                    bottom: convertInchesToTwip(1),
                                    left: convertInchesToTwip(1),
                                },
                            },
                        },
                        children,
                    }],
            });
            const buffer = await Packer.toBuffer(doc);
            const filename = `${title.replace(/[\\/:*?"<>|]/g, '_')}.docx`;
            return {
                success: true,
                content: buffer,
                filename,
                contentType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            };
        }
        catch (error) {
            console.error('生成 docx 失败:', error);
            return { success: false, error: `生成 Word 文档失败: ${error.message}` };
        }
    }
}
function htmlToDocx(element, docxLib, imageMap) {
    const result = [];
    const { Paragraph, TextRun, HeadingLevel, ImageRun, Table, TableRow, TableCell, BorderStyle, WidthType, AlignmentType, ImageType, } = docxLib;
    let listStack = [];
    function processNode(node, isInline = false) {
        if (node.nodeType === 3) {
            const text = node.textContent || '';
            if (!text.trim() && !isInline)
                return [];
            return [new TextRun({ text, size: 22 })];
        }
        if (node.nodeType !== 1)
            return [];
        const el = node;
        const tag = el.tagName.toLowerCase();
        switch (tag) {
            case 'h1':
                return [new Paragraph({
                        children: getTextRuns(el),
                        heading: HeadingLevel.HEADING_1,
                        spacing: { before: 400, after: 200 },
                    })];
            case 'h2':
                return [new Paragraph({
                        children: getTextRuns(el),
                        heading: HeadingLevel.HEADING_2,
                        spacing: { before: 300, after: 200 },
                    })];
            case 'h3':
                return [new Paragraph({
                        children: getTextRuns(el),
                        heading: HeadingLevel.HEADING_3,
                        spacing: { before: 200, after: 150 },
                    })];
            case 'h4':
            case 'h5':
            case 'h6':
                return [new Paragraph({
                        children: getTextRuns(el),
                        heading: HeadingLevel.HEADING_4,
                        spacing: { before: 200, after: 100 },
                    })];
            case 'p':
                const pRuns = [];
                el.childNodes.forEach(child => {
                    pRuns.push(...processNode(child, true));
                });
                return [new Paragraph({
                        children: pRuns,
                        spacing: { after: 200, line: 360 },
                    })];
            case 'br':
                return [new Paragraph({ children: [] })];
            case 'hr':
                return [new Paragraph({
                        border: { bottom: { style: BorderStyle.SINGLE, size: 6, color: 'CCCCCC' } },
                        spacing: { before: 200, after: 200 },
                    })];
            case 'strong':
            case 'b':
                return [new TextRun({ text: el.textContent || '', bold: true, size: 22 })];
            case 'em':
            case 'i':
                return [new TextRun({ text: el.textContent || '', italics: true, size: 22 })];
            case 'del':
            case 's':
            case 'strike':
                return [new TextRun({ text: el.textContent || '', strike: true, size: 22 })];
            case 'code':
                return [new TextRun({
                        text: el.textContent || '',
                        font: 'Courier New',
                        size: 20,
                        color: 'E83E8C',
                    })];
            case 'pre':
                const codeText = el.textContent || '';
                const lines = codeText.split('\n');
                return lines.map(line => new Paragraph({
                    children: [new TextRun({ text: line || ' ', font: 'Courier New', size: 20 })],
                    spacing: { after: 50 },
                    shading: { fill: 'F6F8FA' },
                    indent: { left: 200 },
                }));
            case 'blockquote':
                const bqRuns = [];
                el.childNodes.forEach(child => {
                    bqRuns.push(...processNode(child, true));
                });
                return [new Paragraph({
                        children: bqRuns,
                        spacing: { after: 200, left: 400 },
                        border: { left: { style: BorderStyle.SINGLE, size: 18, color: 'DDDDDD' } },
                        indent: { left: 400 },
                    })];
            case 'a':
                const href = el.getAttribute('href') || '';
                const linkText = el.textContent || href;
                return [new TextRun({
                        text: linkText,
                        color: '0366D6',
                        underline: {},
                        size: 22,
                    })];
            case 'img': {
                const src = el.getAttribute('src') || '';
                const alt = el.getAttribute('alt') || '图片';
                if (imageMap && imageMap.has(src)) {
                    const base64Data = imageMap.get(src);
                    try {
                        const mimeMatch = base64Data.match(/^data:([^;]+);base64,/);
                        const mimeType = mimeMatch ? mimeMatch[1] : 'image/png';
                        const pureBase64 = base64Data.replace(/^data:[^;]+;base64,/, '');
                        let imageType = "png";
                        if (mimeType.includes('jpeg') || mimeType.includes('jpg')) {
                            imageType = "jpg";
                        }
                        else if (mimeType.includes('gif')) {
                            imageType = "gif";
                        }
                        else if (mimeType.includes('bmp')) {
                            imageType = "bmp";
                        }
                        return [new Paragraph({
                                children: [
                                    new ImageRun({
                                        data: pureBase64,
                                        type: imageType,
                                        transformation: {
                                            width: 400,
                                            height: 300,
                                        },
                                        alignment: AlignmentType.CENTER,
                                    }),
                                ],
                                alignment: AlignmentType.CENTER,
                                spacing: { before: 200, after: 200 },
                            })];
                    }
                    catch (e) {
                        console.log(`[图片嵌入] 失败: ${e.message}`);
                    }
                }
                if (src) {
                    return [new Paragraph({
                            children: [
                                new TextRun({ text: `📷 ${alt}`, color: '0366D6', underline: {}, size: 22 }),
                                new TextRun({ text: ` (${src})`, color: '666666', size: 18 }),
                            ],
                            spacing: { before: 200, after: 200 },
                        })];
                }
                return [new Paragraph({
                        children: [new TextRun({ text: `[图片: ${alt}]`, italics: true, color: '888888', size: 20 })],
                        alignment: AlignmentType.CENTER,
                        spacing: { before: 200, after: 200 },
                    })];
            }
            case 'ul':
            case 'ol':
                const listItems = [];
                const listType = tag;
                el.querySelectorAll(':scope > li').forEach((li, index) => {
                    const liRuns = [];
                    li.childNodes.forEach(child => {
                        liRuns.push(...processNode(child, true));
                    });
                    const bullet = listType === 'ul' ? '• ' : `${index + 1}. `;
                    listItems.push(new Paragraph({
                        children: [
                            new TextRun({ text: bullet, size: 22 }),
                            ...liRuns,
                        ],
                        spacing: { after: 100 },
                        indent: { left: 400, hanging: 200 },
                    }));
                });
                return listItems;
            case 'li':
                return [];
            case 'table':
                const rows = [];
                el.querySelectorAll('tr').forEach(tr => {
                    const cells = [];
                    tr.querySelectorAll('th, td').forEach(cell => {
                        cells.push(new TableCell({
                            children: [
                                new Paragraph({
                                    children: [new TextRun({ text: cell.textContent || '', size: 20 })],
                                }),
                            ],
                            borders: {
                                top: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' },
                                bottom: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' },
                                left: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' },
                                right: { style: BorderStyle.SINGLE, size: 6, color: 'DDDDDD' },
                            },
                        }));
                    });
                    rows.push(new TableRow({ children: cells }));
                });
                return [new Table({
                        rows,
                        width: { size: 100, type: WidthType.PERCENTAGE },
                    }), new Paragraph({ spacing: { after: 200 } })];
            case 'div':
            case 'article':
            case 'section':
            case 'main':
            case 'span':
                const divRuns = [];
                el.childNodes.forEach(child => {
                    divRuns.push(...processNode(child, isInline));
                });
                return divRuns;
            default:
                const defaultText = el.textContent || '';
                if (defaultText.trim()) {
                    return [new TextRun({ text: defaultText, size: 22 })];
                }
                return [];
        }
    }
    function getTextRuns(el) {
        const runs = [];
        el.childNodes.forEach(child => {
            runs.push(...processNode(child, true));
        });
        if (runs.length === 0) {
            runs.push(new TextRun({ text: el.textContent || '', size: 22 }));
        }
        return runs;
    }
    element.childNodes.forEach(child => {
        const nodes = processNode(child);
        if (Array.isArray(nodes)) {
            result.push(...nodes);
        }
    });
    return result;
}
export const articleService = {
    getArticleContent,
    verifyOwnership,
    extractFullContent,
    generateDownload,
};
//# sourceMappingURL=article.service.js.map
import { Router } from 'express';
import { z } from 'zod';
import { subscriptionService, rssService } from '../services/index.js';
import { authMiddleware, validateBody, validateQuery } from '../middleware/index.js';

const ROUTE_TAGS: Record<string, string[]> = {};

const router = Router();

// 所有订阅路由都需要登录
router.use(authMiddleware);

// 创建订阅验证
const createSchema = z.object({
  routeUrl: z.string().min(1, '请输入订阅URL'),
  title: z.string().optional(),
  categoryId: z.number().optional(),
  filterKeywords: z.string().optional(),
  tags: z.array(z.string()).optional(),
  filterInclude: z.string().optional(),
  filterExclude: z.string().optional(),
  refreshInterval: z.number().min(30).max(1440).optional(),
  config: z.record(z.any()).optional(),
});

// 更新订阅验证
const updateSchema = z.object({
  title: z.string().optional(),
  categoryId: z.number().nullable().optional(),
  filterKeywords: z.string().optional(),
  tags: z.array(z.string()).optional(),
  filterInclude: z.string().optional(),
  filterExclude: z.string().optional(),
  refreshInterval: z.number().min(30).max(1440).optional(),
  config: z.record(z.any()).optional(),
});

// 列表查询验证
const listSchema = z.object({
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(10),
  categoryId: z.coerce.number().optional(),
});

// 预设路由列表
const ROUTES = [
  // 科技资讯
  { name: '36氪', category: '科技资讯', description: '36氪最新资讯，关注创业和科技', example: '/36kr/news/latest' },
  { name: '虎嗅网', category: '科技资讯', description: '虎嗅网最新文章，深度科技商业分析', example: '/huxiu/article' },
  { name: 'Readhub', category: '科技资讯', description: 'Readhub热门话题，科技资讯聚合', example: '/readhub/topic' },
  { name: '知乎日报', category: '科技资讯', description: '知乎日报每日推荐精选内容', example: '/zhihu/daily' },
  { name: '澎湃新闻', category: '科技资讯', description: '澎湃新闻精选报道，优质新闻内容', example: '/thepaper/featured' },
  { name: '爱范儿', category: '科技资讯', description: '爱范儿-发现科技生活的美好', example: '/ifanr/app' },
  { name: '品玩', category: '科技资讯', description: '品玩-PingWest，有品好玩', example: '/pingwest/category/kuaibao' },
  { name: 'IT之家', category: '科技资讯', description: 'IT之家-数码科技第一门户', example: '/ithome/news/rank' },
  { name: '少数派', category: '科技资讯', description: '少数派-数字生活方式指南', example: '/sspai/index' },
  { name: '极客公园', category: '科技资讯', description: '极客公园-推动创新者和他们的思考', example: '/geekpark/news' },

  // 财经商业
  { name: '财新网', category: '财经商业', description: '财新网最新资讯，权威财经新闻', example: '/caixin/latest' },
  { name: '华尔街见闻', category: '财经商业', description: '华尔街见闻全球财经资讯', example: '/wallstreetcn/news/latest' },
  { name: '财联社电报', category: '财经商业', description: '财联社7x24小时实时财经快讯', example: '/cls/telegraph' },
  { name: '第一财经', category: '财经商业', description: '第一财经-商业世界的必读品', example: '/yicai/news/latest' },
  { name: '界面新闻', category: '财经商业', description: '界面新闻-只服务于独立思考的人群', example: '/jiemian/news/latest' },
  { name: '经济观察网', category: '财经商业', description: '经济观察网-理性建设性', example: '/eeo/latest' },
  { name: '雪球热门', category: '财经商业', description: '雪球-聪明的投资者都在这里', example: '/xueqiu/hot' },
  { name: '美股投资网', category: '财经商业', description: 'meegoo美股投资网-美股开户及华尔街资讯', example: 'https://www.meegoo.com/feed' },

  // 社区热榜
  { name: '知乎热榜', category: '社区热榜', description: '知乎全站热榜问题，实时了解热门话题', example: '/zhihu/hot' },
  { name: '微博热搜', category: '社区热榜', description: '微博热搜榜，实时热点追踪', example: '/weibo/search/hot' },
  { name: 'V2EX', category: '社区热榜', description: 'V2EX-创意工作者的社区', example: '/v2ex/topics/hot' },
  { name: 'B站热门', category: '社区热榜', description: '哔哩哔哩热门视频推荐', example: '/bilibili/ranking/0/1' },
  { name: '豆瓣热门', category: '社区热榜', description: '豆瓣热门讨论话题', example: '/douban/movie/playing' },
  { name: '贴吧热议', category: '社区热榜', description: '百度贴吧热议话题', example: '/tieba/tbindex/frs-sign/forumid-5' },

  // 技术开发
  { name: '掘金前端', category: '技术开发', description: '掘金前端频道优质技术文章', example: '/juejin/category/frontend' },
  { name: '掘金后端', category: '技术开发', description: '掘金后端频道优质技术文章', example: '/juejin/category/backend' },
  { name: 'Hacker News', category: '技术开发', description: 'Hacker News热门技术讨论', example: '/hackernews' },
  { name: 'GitHub Trending', category: '技术开发', description: 'GitHub每日热门开源项目', example: '/github/trending/daily' },
  { name: 'InfoQ', category: '技术开发', description: 'InfoQ-促进软件开发领域知识与创新的传播', example: '/infoq/recommend' },
  { name: '博客园', category: '技术开发', description: '博客园-开发者的网上家园', example: '/cnblogs/best' },
  { name: 'Linux中国', category: '技术开发', description: 'Linux中国-深度开源技术', example: '/linuxct/article' },

  // 阅读文化
  { name: '果壳网', category: '阅读文化', description: '果壳网科学人，有趣的科普内容', example: '/guokr/scientific' },
  { name: '阮一峰的网络日志', category: '阅读文化', description: '科技爱好者周刊和技术文章', example: 'https://www.ruanyifeng.com/blog/atom.xml' },
  { name: '豆瓣新书榜', category: '阅读文化', description: '豆瓣读书最新上架书籍', example: '/douban/book/latest' },
  { name: '简书热门', category: '阅读文化', description: '简书热门推荐文章', example: '/jianshu/popular' },
  { name: '人人都是产品经理', category: '阅读文化', description: '产品经理学习成长平台', example: '/woshipm/aiye' },
  { name: '鸟哥笔记', category: '阅读文化', description: '鸟哥笔记-移动互联网运营推广干货平台', example: '/niaoge/yunying' },

  // 生活方式
  { name: '什么值得买', category: '生活方式', description: '什么值得买-高性价比网购推荐', example: '/smzdm/youxuan' },
  { name: '下厨房', category: '生活方式', description: '下厨房-美食菜谱推荐', example: '/xiachufang/popular' },
  { name: '马蜂窝', category: '生活方式', description: '马蜂窝-旅游攻略与游记', example: '/mafengwo/note' },
];

// 获取可用路由列表
router.get('/routes', (req, res) => {
  const routesWithTags = ROUTES.map(route => ({
    ...route,
    tags: ROUTE_TAGS[route.example] || []
  }));
  res.json({
    success: true,
    data: { routes: routesWithTags }
  });
});

// 获取订阅列表
router.get('/', validateQuery(listSchema), async (req, res, next) => {
  try {
    const { page, limit, categoryId } = req.query as { page: number; limit: number; categoryId?: number };
    const offset = (page - 1) * limit;

    const subscriptions = await subscriptionService.getByUserId(req.user!.userId, categoryId);
    const total = subscriptions.length;

    res.json({
      success: true,
      data: {
        list: subscriptions.slice(offset, offset + limit),
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// 获取单个订阅
router.get('/:id', async (req, res, next) => {
  try {
    const subscription = await subscriptionService.getById(parseInt(req.params.id));
    if (!subscription || subscription.userId !== req.user!.userId) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '订阅不存在',
        },
      });
    }
    res.json({
      success: true,
      data: subscription,
    });
  } catch (error) {
    next(error);
  }
});

// 创建订阅
router.post('/', validateBody(createSchema), async (req, res, next) => {
  try {
    const subscription = await subscriptionService.create({
      ...req.body,
      userId: req.user!.userId,
    });

    // 自动同步一次文章
    try {
      await rssService.syncSubscription(
        subscription.id,
        subscription.routeUrl,
        subscription.filterInclude,
        subscription.filterExclude
      );
    } catch (error) {
      console.error('首次同步失败:', error);
    }

    res.status(201).json({
      success: true,
      data: subscription,
      message: '订阅创建成功',
    });
  } catch (error) {
    next(error);
  }
});

// 更新订阅
router.put('/:id', validateBody(updateSchema), async (req, res, next) => {
  try {
    const subscription = await subscriptionService.update(
      parseInt(req.params.id),
      req.user!.userId,
      req.body
    );
    if (!subscription) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '订阅不存在',
        },
      });
    }
    res.json({
      success: true,
      data: subscription,
      message: '订阅更新成功',
    });
  } catch (error) {
    next(error);
  }
});

// 删除订阅
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await subscriptionService.delete(parseInt(req.params.id), req.user!.userId);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '订阅不存在',
        },
      });
    }
    res.json({
      success: true,
      message: '订阅删除成功',
    });
  } catch (error) {
    next(error);
  }
});

export default router;

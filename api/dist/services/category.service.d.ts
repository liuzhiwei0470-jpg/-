import type { CategoryCreateInput, CategoryResponse } from '../models/category';
export declare class CategoryService {
    create(input: CategoryCreateInput): Promise<CategoryResponse>;
    getByUserId(userId: number): Promise<CategoryResponse[]>;
    getById(id: number): Promise<CategoryResponse | null>;
    update(id: number, userId: number, name: string): Promise<CategoryResponse | null>;
    delete(id: number, userId: number): Promise<boolean>;
    private toResponse;
}
export declare const categoryService: CategoryService;
//# sourceMappingURL=category.service.d.ts.map
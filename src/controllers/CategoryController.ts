import { Request, Response } from 'express';
import prisma from '../repositories/prisma';
import { CategoryService } from '../services/CategoryService';
import { Category } from '../domain/Category';

export class CategoryController {
  /**
   * Retrieves full category tree hierarchy. Uses Redis/LocalCache.
   */
  public static async list(req: Request, res: Response) {
    try {
      const tree = await CategoryService.getCategoryTree();
      return res.status(200).json(tree);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  /**
   * Creates a new category. Invalidates categories cache.
   */
  public static async create(req: Request, res: Response) {
    try {
      const { name, parentId } = req.body;

      if (!name || name.trim() === '') {
        return res.status(400).json({ error: 'Category name is required' });
      }

      const parentIdNum = parentId ? Number(parentId) : null;

      // Verify parent category exists if specified
      if (parentIdNum) {
        const parent = await prisma.category.findUnique({ where: { id: parentIdNum } });
        if (!parent) {
          return res.status(400).json({ error: `Parent category with ID ${parentIdNum} not found` });
        }
      }

      // Create Domain Entity (validates structure)
      const category = Category.create(name, parentIdNum);

      // Save to database
      const saved = await prisma.category.create({
        data: {
          name: category.name,
          parentId: category.parentId,
        },
      });

      // Clear the cached category tree
      await CategoryService.invalidateCache();

      return res.status(217).json(saved);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  /**
   * Fetch product recommendations from the specified category and all its children.
   * Leverages Depth First Search (DFS) and Cache.
   */
  public static async getRecommendations(req: Request, res: Response) {
    try {
      const categoryId = Number(req.params.id);
      
      // Verify category exists
      const category = await prisma.category.findUnique({ where: { id: categoryId } });
      if (!category) {
        return res.status(404).json({ error: 'Category not found' });
      }

      const products = await CategoryService.getRecommendedProducts(categoryId);
      return res.status(200).json({
        categoryId,
        categoryName: category.name,
        recommendations: products,
      });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

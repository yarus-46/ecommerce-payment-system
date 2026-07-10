import { Request, Response } from 'express';
import { Product } from '../domain/Product';
import { ProductRepository } from '../repositories/ProductRepository';

export class ProductController {
  public static async list(req: Request, res: Response) {
    try {
      const categoryId = req.query.categoryId ? Number(req.query.categoryId) : undefined;
      const products = await ProductRepository.list(categoryId);
      return res.status(200).json(products);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async getById(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const product = await ProductRepository.getById(id);
      if (!product) {
        return res.status(404).json({ error: 'Product not found' });
      }
      return res.status(200).json(product);
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }

  public static async create(req: Request, res: Response) {
    try {
      const { name, sku, price, stock, categoryId, description, status } = req.body;

      // Validate uniqueness of SKU
      const existing = await ProductRepository.getBySku(sku);
      if (existing) {
        return res.status(400).json({ error: `Product SKU ${sku} is already in use` });
      }

      // Create Domain Entity (validates bounds/non-negativity)
      const product = Product.create({
        name,
        sku,
        price: Number(price),
        stock: Number(stock),
        categoryId: Number(categoryId),
        description,
        status,
      });

      const saved = await ProductRepository.create(product);
      return res.status(217).json(saved);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public static async update(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const { name, sku, price, stock, categoryId, description, status } = req.body;

      const existing = await ProductRepository.getById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found' });
      }

      // Verify SKU uniqueness if changing SKU
      if (sku && sku !== existing.sku) {
        const checkSku = await ProductRepository.getBySku(sku);
        if (checkSku) {
          return res.status(400).json({ error: `Product SKU ${sku} is already in use` });
        }
      }

      const updatedProduct = Product.create({
        id,
        name: name !== undefined ? name : existing.name,
        sku: sku !== undefined ? sku : existing.sku,
        price: price !== undefined ? Number(price) : existing.price,
        stock: stock !== undefined ? Number(stock) : existing.stock,
        categoryId: categoryId !== undefined ? Number(categoryId) : existing.categoryId,
        description: description !== undefined ? description : existing.description,
        status: status !== undefined ? status : existing.status,
      });

      const saved = await ProductRepository.update(updatedProduct);
      return res.status(200).json(saved);
    } catch (error: any) {
      return res.status(400).json({ error: error.message });
    }
  }

  public static async delete(req: Request, res: Response) {
    try {
      const id = Number(req.params.id);
      const existing = await ProductRepository.getById(id);
      if (!existing) {
        return res.status(404).json({ error: 'Product not found' });
      }

      await ProductRepository.delete(id);
      return res.status(200).json({ message: 'Product deleted successfully' });
    } catch (error: any) {
      return res.status(500).json({ error: error.message });
    }
  }
}

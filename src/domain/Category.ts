export class Category {
  public children: Category[] = [];

  constructor(
    public readonly id: number,
    public readonly name: string,
    public readonly parentId: number | null,
    public readonly createdAt?: Date,
    public readonly updatedAt?: Date
  ) {}

  public static create(name: string, parentId: number | null = null, id: number = 0): Category {
    if (!name || name.trim() === '') {
      throw new Error('Category name cannot be empty');
    }
    return new Category(id, name, parentId);
  }

  public addChild(category: Category): void {
    if (category.parentId !== this.id) {
      throw new Error('Cannot add category as child: parentId mismatch');
    }
    this.children.push(category);
  }
}

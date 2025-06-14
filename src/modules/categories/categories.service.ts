import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, TreeRepository } from 'typeorm';
import { Category } from './entities/category.entity';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import slugify from 'slugify';

@Injectable()
export class CategoriesService {
    constructor(
        @InjectRepository(Category)
        private readonly categoryRepository: TreeRepository<Category>,
    ) { }

    async create(createCategoryDto: CreateCategoryDto): Promise<Category> {
        const category = new Category();
        Object.assign(category, createCategoryDto);

        // Generate slug if not provided
        if (!category.slug) {
            category.slug = slugify(category.name, { lower: true });
        }

        // Set parent if parentId is provided
        if (createCategoryDto.parentId) {
            const parent = await this.categoryRepository.findOne({
                where: { id: createCategoryDto.parentId },
            });
            if (!parent) {
                throw new NotFoundException(`Parent category with ID ${createCategoryDto.parentId} not found`);
            }
            category.parent = parent;
        }

        return this.categoryRepository.save(category);
    }

    async findAll(): Promise<Category[]> {
        return this.categoryRepository.findTrees();
    }

    async findOne(id: string): Promise<Category> {
        const category = await this.categoryRepository.findOne({
            where: { id },
            relations: ['children', 'parent'],
        });

        if (!category) {
            throw new NotFoundException(`Category with ID ${id} not found`);
        }

        return category;
    }

    async findBySlug(slug: string): Promise<Category> {
        const category = await this.categoryRepository.findOne({
            where: { slug },
            relations: ['children', 'parent'],
        });

        if (!category) {
            throw new NotFoundException(`Category with slug ${slug} not found`);
        }

        return category;
    }

    async update(id: string, updateCategoryDto: UpdateCategoryDto): Promise<Category> {
        const category = await this.findOne(id);

        // Update slug if name is changed and slug is not provided
        if (updateCategoryDto.name && !updateCategoryDto.slug) {
            updateCategoryDto.slug = slugify(updateCategoryDto.name, { lower: true });
        }

        // Update parent if parentId is changed
        if (updateCategoryDto.parentId) {
            if (updateCategoryDto.parentId === id) {
                throw new BadRequestException('Category cannot be its own parent');
            }

            const parent = await this.categoryRepository.findOne({
                where: { id: updateCategoryDto.parentId },
            });
            if (!parent) {
                throw new NotFoundException(`Parent category with ID ${updateCategoryDto.parentId} not found`);
            }
            category.parent = parent;
        }

        Object.assign(category, updateCategoryDto);
        return this.categoryRepository.save(category);
    }

    async remove(id: string): Promise<void> {
        const category = await this.findOne(id);

        if (category.children && category.children.length > 0) {
            throw new BadRequestException('Cannot delete category with subcategories');
        }

        await this.categoryRepository.remove(category);
    }

    async getPath(id: string): Promise<Category[]> {
        const category = await this.findOne(id);
        return this.categoryRepository.findAncestors(category);
    }

    async getChildren(id: string): Promise<Category[]> {
        const category = await this.findOne(id);
        return this.categoryRepository.findDescendants(category);
    }

    async moveCategory(id: string, newParentId: string | null): Promise<Category> {
        const category = await this.findOne(id);

        if (newParentId) {
            if (newParentId === id) {
                throw new BadRequestException('Category cannot be its own parent');
            }

            const parent = await this.categoryRepository.findOne({
                where: { id: newParentId },
            });
            if (!parent) {
                throw new NotFoundException(`Parent category with ID ${newParentId} not found`);
            }
            category.parent = parent;
        } else {
            category.parent = null;
        }

        return this.categoryRepository.save(category);
    }
} 
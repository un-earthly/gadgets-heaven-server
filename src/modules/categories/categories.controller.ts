import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { CategoriesService } from './categories.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { Category } from './entities/category.entity';

@ApiTags('categories')
@Controller('categories')
export class CategoriesController {
    constructor(private readonly categoriesService: CategoriesService) { }

    @Post()
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new category' })
    @ApiResponse({ status: 201, description: 'Category created successfully', type: Category })
    create(@Body() createCategoryDto: CreateCategoryDto) {
        return this.categoriesService.create(createCategoryDto);
    }

    @Get()
    @ApiOperation({ summary: 'Get all categories in tree structure' })
    @ApiResponse({ status: 200, description: 'Returns all categories', type: [Category] })
    findAll() {
        return this.categoriesService.findAll();
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get a category by ID' })
    @ApiResponse({ status: 200, description: 'Returns the category', type: Category })
    findOne(@Param('id') id: string) {
        return this.categoriesService.findOne(id);
    }

    @Get('slug/:slug')
    @ApiOperation({ summary: 'Get a category by slug' })
    @ApiResponse({ status: 200, description: 'Returns the category', type: Category })
    findBySlug(@Param('slug') slug: string) {
        return this.categoriesService.findBySlug(slug);
    }

    @Patch(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update a category' })
    @ApiResponse({ status: 200, description: 'Category updated successfully', type: Category })
    update(@Param('id') id: string, @Body() updateCategoryDto: UpdateCategoryDto) {
        return this.categoriesService.update(id, updateCategoryDto);
    }

    @Delete(':id')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Delete a category' })
    @ApiResponse({ status: 200, description: 'Category deleted successfully' })
    remove(@Param('id') id: string) {
        return this.categoriesService.remove(id);
    }

    @Get(':id/path')
    @ApiOperation({ summary: 'Get category path (ancestors)' })
    @ApiResponse({ status: 200, description: 'Returns category ancestors', type: [Category] })
    getPath(@Param('id') id: string) {
        return this.categoriesService.getPath(id);
    }

    @Get(':id/children')
    @ApiOperation({ summary: 'Get category children (descendants)' })
    @ApiResponse({ status: 200, description: 'Returns category descendants', type: [Category] })
    getChildren(@Param('id') id: string) {
        return this.categoriesService.getChildren(id);
    }

    @Patch(':id/move')
    @UseGuards(JwtAuthGuard)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Move category to new parent' })
    @ApiResponse({ status: 200, description: 'Category moved successfully', type: Category })
    moveCategory(@Param('id') id: string, @Body('parentId') parentId: string | null) {
        return this.categoriesService.moveCategory(id, parentId);
    }
} 
import { Controller } from '@nestjs/common';
import { ProductService } from './product.service';
import {
    ProductServiceController,
    ProductServiceControllerMethods,
    CreateProductRequest,
    CreateProductResponse,
    GetProductRequest,
    GetProductResponse,
    UpdateProductRequest,
    UpdateProductResponse,
    DeleteProductRequest,
    DeleteProductResponse,
    ListProductsRequest,
    ListProductsResponse,
    SearchProductsRequest,
    SearchProductsResponse,
    UpdateInventoryRequest,
    UpdateInventoryResponse,
    CheckInventoryRequest,
    CheckInventoryResponse,
} from '../proto/product';

@Controller()
@ProductServiceControllerMethods()
export class ProductController implements ProductServiceController {
    constructor(private readonly productService: ProductService) { }

    async createProduct(request: CreateProductRequest): Promise<CreateProductResponse> {
        return this.productService.createProduct(request);
    }

    async getProduct(request: GetProductRequest): Promise<GetProductResponse> {
        return this.productService.getProduct(request);
    }

    async updateProduct(request: UpdateProductRequest): Promise<UpdateProductResponse> {
        return this.productService.updateProduct(request);
    }

    async deleteProduct(request: DeleteProductRequest): Promise<DeleteProductResponse> {
        return this.productService.deleteProduct(request);
    }

    async listProducts(request: ListProductsRequest): Promise<ListProductsResponse> {
        return this.productService.listProducts(request);
    }

    async searchProducts(request: SearchProductsRequest): Promise<SearchProductsResponse> {
        return this.productService.searchProducts(request);
    }

    async updateInventory(request: UpdateInventoryRequest): Promise<UpdateInventoryResponse> {
        return this.productService.updateInventory(request);
    }

    async checkInventory(request: CheckInventoryRequest): Promise<CheckInventoryResponse> {
        return this.productService.checkInventory(request);
    }
}

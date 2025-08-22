import mongoose from 'mongoose'
import ProductModel from '../models/product.model'
import CategoryModel from '../models/category.model'
import BrandModel from '../models/brand.model'
import AttributeModel from '../models/attribute.model'
import BlogModel from '../models/blog.model'
import BlogCategoryModel from '../models/blogcategory.model'

const MONGODB_URI = 'mongodb+srv://thenam2kx:5rZYY4rFxfZ9uHe0@cluster0.hcrkc.mongodb.net/graduation?retryWrites=true&w=majority&appName=Cluster0'

async function fixSoftDeleteData() {
  try {
    await mongoose.connect(MONGODB_URI)
    console.log('✅ Connected to MongoDB')

    const models = [
      { name: 'products', model: ProductModel },
      { name: 'categories', model: CategoryModel },
      { name: 'brands', model: BrandModel },
      { name: 'attributes', model: AttributeModel },
      { name: 'blogs', model: BlogModel },
      { name: 'cateblogs', model: BlogCategoryModel }
    ]

    for (const { name, model } of models) {
      console.log(`\n🔧 Fixing ${name}...`)
      
      // Reset tất cả documents về trạng thái không bị xóa
      const result = await model.updateMany(
        {},
        {
          $unset: {
            deleted: 1,
            deletedAt: 1,
            deletedBy: 1
          }
        }
      )
      
      console.log(`   Updated ${result.modifiedCount} documents`)
    }

    console.log('\n✅ Fixed all soft delete data!')
    
  } catch (error) {
    console.error('❌ Error:', error)
  } finally {
    await mongoose.disconnect()
    console.log('🔌 Disconnected from MongoDB')
  }
}

fixSoftDeleteData()
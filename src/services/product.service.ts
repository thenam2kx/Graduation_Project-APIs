/* eslint-disable @typescript-eslint/no-explicit-any */
import aqp from 'api-query-params'
import ApiError from '~/utils/ApiError'
import { StatusCodes } from 'http-status-codes'
import ProductModel from '~/models/product.model'
import { convertSlugUrl, isExistObject, isValidMongoId } from '~/utils/utils'
import '../models/category.model'
import '../models/brand.model'
import mongoose from 'mongoose'
import ProductVariantModel from '~/models/product-variant.model'
import VariantAttributeModel from '~/models/variant-attribute.model'
import AttributeModel from '~/models/attribute.model'

export interface IAttributeValue {
  name: string
  value: string
}

export interface IVariantAttribute {
  attributeId: string
  variantId: string
  value: string
}

export interface IProductVariant {
  sku: string
  price: number
  stock: number
  image: string
  attributes: IAttributeValue[]
}

export interface IProduct {
  name: string
  slug: string
  price?: number // optional vì có thể được ghi đè bởi variant
  description?: string
  categoryId?: string // ObjectId
  brandId?: string
  image?: string
  stock?: number
  capacity: number
  variants?: IProductVariant | IProductVariant[]
}

// const handleCreateProduct = async (productData: IProduct) => {
//   const session = await mongoose.startSession()
//   session.startTransaction()
//   try {
//     await isExistObject(
//       ProductModel,
//       { name: productData.name },
//       {
//         checkExisted: true,
//         errorMessage: 'Sản phẩm đã tồn tại!'
//       }
//     )
//     if (!productData.variants || !Array.isArray(productData.variants)) {
//       const result = await ProductModel.create(
//         [
//           {
//             ...productData,
//             slug: productData?.slug ?? convertSlugUrl(productData.name)
//           }
//         ],
//         { session }
//       )
//       return result[0].toObject()
//     } else {
//       // Create product
//       const result = await ProductModel.create(
//         [
//           {
//             ...productData,
//             slug: productData?.slug ?? convertSlugUrl(productData.name)
//           }
//         ],
//         { session }
//       )

//       const product = result[0]

//       // Create product_variants
//       const variants = productData.variants.map((variantData: IProductVariant) => {
//         return {
//           productId: product._id,
//           sku: variantData.sku,
//           price: variantData.price,
//           stock: variantData.stock,
//           image: variantData.image
//         }
//       })
//       const insertedVariants = await ProductVariantModel.insertMany(variants, { session })
//       console.log('🚀 ~ handleCreateProduct ~ insertedVariants:', insertedVariants)

//       // Create attributes
//       const attributes: { name: string; slug: string }[] = productData.variants.flatMap((variant: IProductVariant) =>
//         variant.attributes.map((attr: IAttributeValue) => ({
//           name: attr.name,
//           slug: convertSlugUrl(attr.name)
//         }))
//       )
//       const insertedAttributes = await AttributeModel.insertMany(attributes, { session })

//       const arrInsertedAttributes = insertedAttributes.map((attr) => ({
//         attributeId: attr._id,
//         name: attr.name,
//         slug: attr.slug
//       }))

//       // Create variant_attributes
//       const variantAttributes: IVariantAttribute[] = []
//       insertedVariants.forEach((variant, index) => {
//         const variantsArray = productData.variants as IProductVariant[]
//         const attributes = variantsArray[index]?.attributes

//         attributes?.forEach((attr) => {
//           variantAttributes.push({
//             variantId: variant._id as string,
//             attributeId: arrInsertedAttributes[index].attributeId as string,
//             value: (attr as any).value as string
//           })
//         })
//       })

//       await VariantAttributeModel.insertMany(variantAttributes, { session })
//       await session.commitTransaction()
//       session.endSession()

//       return 'Tạo sản phẩm thành công!'
//     }
//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   } catch (error) {
//     await session.abortTransaction()
//     session.endSession()
//     throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Có lỗi xảy ra trong quá trình tạo sản phẩm!')
//   }
// }

const handleCreateProduct = async (productData: IProduct) => {
  // 1. Bắt đầu session + transaction
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // 2. Kiểm tra sản phẩm đã tồn tại hay chưa (theo name)
    await isExistObject(
      ProductModel,
      { name: productData.name },
      {
        checkExisted: true,
        errorMessage: 'Sản phẩm đã tồn tại!'
      }
    )

    // 3. Tạo slug nếu chưa có
    const slug = productData.slug ?? convertSlugUrl(productData.name)

    // 4. Tạo product chính
    const createdProducts = await ProductModel.create(
      [
        {
          ...productData,
          slug
        }
      ],
      { session }
    )
    const product = createdProducts[0]

    // 5. Nếu không có variants -> commit và return luôn
    if (!productData.variants || !Array.isArray(productData.variants) || productData.variants.length === 0) {
      await session.commitTransaction()
      session.endSession()
      // Trả về product dạng Object (lean)
      return product.toObject()
    }

    // 6. Nếu có variants, xử lý tiếp:
    // 6.1 Tạo các ProductVariant (chưa include attributes)
    const variantDocs = productData.variants.map((variant: IProductVariant) => ({
      productId: product._id,
      sku: variant.sku,
      price: variant.price,
      stock: variant.stock,
      image: variant.image
    }))
    const createdVariants = await ProductVariantModel.insertMany(variantDocs, { session })

    // 6.2 Chuẩn bị danh sách attribute unique
    //   - Mỗi attributeValue có { name, value }. Ở đây ta chỉ quan tâm đến name (để lưu vào collection Attribute),
    //     phần “value” sẽ lưu riêng trong VariantAttribute.
    //   - Dùng Map để gom theo slug, tránh duplicate.
    interface AttrInfo {
      name: string
      slug: string
    }
    const slugToAttrInfo = new Map<string, AttrInfo>()

    // Kiểm tra từng variant, từng attributes trong variant
    productData.variants.forEach((variant: IProductVariant) => {
      ;(variant.attributes || []).forEach((attr: IAttributeValue) => {
        const name = attr.name
        const slugAttr = convertSlugUrl(name)
        if (!slugToAttrInfo.has(slugAttr)) {
          slugToAttrInfo.set(slugAttr, { name, slug: slugAttr })
        }
      })
    })

    // 6.3 Upsert tất cả Attribute (có thể dùng bulkWrite hoặc loop findOneAndUpdate)
    // Dưới đây là cách tuần tự cho dễ hiểu:
    const slugToAttrId = new Map<string, mongoose.Types.ObjectId>()
    for (const [slugAttr, info] of slugToAttrInfo.entries()) {
      // Tìm hoặc tạo mới
      const attrDoc = await AttributeModel.findOneAndUpdate(
        { slug: slugAttr },
        { $setOnInsert: { name: info.name, slug: info.slug } },
        { upsert: true, new: true, session }
      )
      slugToAttrId.set(slugAttr, attrDoc._id as mongoose.Types.ObjectId)
    }

    // 6.4 Xây mảng variantAttributes: mỗi variant -> mỗi attributes (không copy "name" sang AttributeModel nữa, chỉ lưu value)
    const variantAttributesToInsert: IVariantAttribute[] = []
    if (Array.isArray(productData.variants)) {
      createdVariants.forEach((variantDoc, idx) => {
        const originalVariant = (productData.variants as IProductVariant[])[idx]
        ;(originalVariant.attributes || []).forEach((attrVal: IAttributeValue) => {
          const slugAttr = convertSlugUrl(attrVal.name)
          const attributeId = slugToAttrId.get(slugAttr)! // đảm bảo phải có

          variantAttributesToInsert.push({
            variantId: variantDoc._id as any,
            attributeId: attributeId as any,
            value: (attrVal as any).value as string
          })
        })
      })
    }

    // 6.5 Insert vào VariantAttributeModel
    await VariantAttributeModel.insertMany(variantAttributesToInsert, { session })

    // 7. Commit transaction & kết thúc
    await session.commitTransaction()
    session.endSession()

    return 'Tạo sản phẩm thành công!'
  } catch (error) {
    // Nếu bất kỳ lỗi nào xảy ra -> rollback và throw
    await session.abortTransaction()
    session.endSession()
    // Nên log thêm error gốc (nếu dùng logger) để dễ debug
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Có lỗi xảy ra trong quá trình tạo sản phẩm!')
  }
}

const handleFetchAllProduct = async ({
  currentPage,
  limit,
  qs
}: {
  currentPage: number
  limit: number
  qs: string
}) => {
  const { filter, sort } = aqp(qs)
  delete filter.current
  delete filter.pageSize

  const offset = (+currentPage - 1) * +limit
  const defaultLimit = +limit || 10

  const totalItems = await ProductModel.countDocuments(filter)
  const totalPages = Math.ceil(totalItems / defaultLimit)

  const results = await ProductModel.find(filter)
    .skip(offset)
    .limit(defaultLimit)
    .sort(sort as any)
    .populate({ path: 'categoryId', model: 'Category', select: 'name' })
    .populate({ path: 'brandId', model: 'Brand', select: 'name' })
    .populate({
      path: 'variants',
      model: 'ProductVariant',
      match: { deleted: false },
      populate: {
        path: 'variant_attributes',
        model: 'VariantAttribute',
        select: 'value',
        match: { deleted: false },
        populate: {
          path: 'attributeId',
          model: 'attributes',
          match: { deleted: false },
          select: 'name slug'
        }
      }
    })
    .lean()
    .exec()

  return {
    meta: {
      current: currentPage,
      pageSize: defaultLimit,
      pages: totalPages,
      total: totalItems
    },
    results
  }
}

const handleFetchInfoProduct = async (productId: string) => {
  isValidMongoId(productId)

  const product = await ProductModel.findById(productId)
    .populate({ path: 'categoryId', model: 'Category', select: 'name' })
    .populate({ path: 'brandId', model: 'Brand', select: 'name' })
    .populate({
      path: 'variants',
      model: 'ProductVariant',
      match: { deleted: false },
      populate: {
        path: 'variant_attributes',
        model: 'VariantAttribute',
        select: 'value',
        match: { deleted: false },
        populate: {
          path: 'attributeId',
          model: 'attributes',
          match: { deleted: false },
          select: 'name slug'
        }
      }
    })
    .lean()
    .exec()

  if (!product) {
    throw new ApiError(StatusCodes.NOT_FOUND, 'Sản phẩm không tồn tại!')
  }

  return product
}

// const handleUpdateProduct = async (productId: string, data: Partial<IProduct>) => {
//   isValidMongoId(productId)

//   const updated = await ProductModel.updateOne({ _id: productId }, data)
//   if (updated.modifiedCount === 0) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để cập nhật!')
//   }

//   return updated
// }

const handleUpdateProduct = async (productId: string, productData: Partial<IProduct>) => {
  // 1. Bắt đầu session + transaction
  const session = await mongoose.startSession()
  session.startTransaction()
  try {
    // 2. Kiểm tra sản phẩm có tồn tại không
    const existingProduct = await ProductModel.findById(productId).session(session)
    if (!existingProduct) {
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để cập nhật!')
    }

    // 3. Nếu user đổi tên (hoặc slug), phải kiểm tra xem name mới đã có sản phẩm khác chưa
    if (productData.name && productData.name !== existingProduct.name) {
      await isExistObject(
        ProductModel,
        { name: productData.name },
        {
          checkExisted: true,
          errorMessage: 'Tên sản phẩm mới trùng với một sản phẩm đã có!'
        }
      )
    }

    // 4. Cập nhật các filed cơ bản của product (như name, slug, description, v.v.)
    const newSlug = productData.slug ?? convertSlugUrl(productData?.name || '')
    if (typeof productData.name === 'string') {
      existingProduct.name = productData.name
    }
    existingProduct.slug = newSlug
    if (typeof productData.description === 'string') {
      existingProduct.description = productData.description
    }
    // ... cập nhật những trường khác theo IProduct (ví dụ price, category, v.v.) nếu có
    await existingProduct.save({ session })

    // 5. Nếu không có variants được gửi lên (hoặc mảng rỗng), ta coi là chỉ update product chứ không đụng gì đến variants
    if (!productData.variants || !Array.isArray(productData.variants) || productData.variants.length === 0) {
      await session.commitTransaction()
      session.endSession()
      return existingProduct.toObject()
    }

    // 6. Nếu có variants, ta phải cập nhật / thêm / xóa bản ghi ProductVariant, Attribute, VariantAttribute
    // 6.1. Lấy tất cả variants cũ hiện có trong DB cho product này
    const existingVariants = await ProductVariantModel.find({ productId }).session(session)

    // 6.2. Phân biệt variants sẽ xóa, variants sẽ giữ (update), variants mới (insert)
    //    - Dựa vào _id: nếu trong existingVariants mà _id không có trong productData.variants, tức là delete
    //    - Nếu productData.variants[i]._id tồn tại, thì mình sẽ update theo _id đó
    //    - Nếu productData.variants[i]._id không tồn tại, tức là variant mới, phải insert

    // 6.2.1. Tạo Set chứa tất cả _id variants incoming (string)
    const incomingVariantIds = new Set<string>()
    productData.variants.forEach((v) => {
      if (v._id) incomingVariantIds.add(v._id)
    })

    // 6.2.2. Xác định variants cần xóa: variants cũ có _id không nằm trong incomingVariantIds
    const variantsToDelete = existingVariants.filter((ev) => !incomingVariantIds.has(ev._id.toString()))

    // 6.2.3. Xác định variants cũ cần giữ/update: those có trong incomingVariantIds
    const variantsToKeep = existingVariants.filter((ev) => incomingVariantIds.has(ev._id.toString()))

    // 6.2.4. Xác định variants mới: those incoming mà không có _id hoặc _id không khớp existing
    const existingVariantIdSet = new Set(existingVariants.map((ev) => ev._id.toString()))
    const variantsToInsert: IProductVariant[] = []
    const variantsToUpdate: IProductVariant[] = [] // sẽ chứa cả those có _id, để update thông tin

    productData.variants.forEach((inc) => {
      if (inc._id && existingVariantIdSet.has(inc._id)) {
        // Variant này tồn tại, sẽ update
        variantsToUpdate.push(inc)
      } else {
        // Không có _id hoặc không khớp với existing, coi như variant mới
        variantsToInsert.push(inc)
      }
    })

    // 6.3. Thực hiện xóa các variant không còn trong incoming
    if (variantsToDelete.length > 0) {
      const idsToDelete = variantsToDelete.map((v) => v._id)
      // Xóa trước variant_attributes liên quan
      await VariantAttributeModel.deleteMany({ variantId: { $in: idsToDelete } }, { session })
      // Xóa variant
      await ProductVariantModel.deleteMany({ _id: { $in: idsToDelete } }, { session })
    }

    // 6.4. Thực hiện cập nhật (update) cho các variant cũ
    for (const incVar of variantsToUpdate) {
      // incVar có chắc _id, tìm doc cũ và cập nhật các field cơ bản
      const toUpdate = await ProductVariantModel.findById(incVar._id).session(session)
      if (!toUpdate) {
        // Nguyên tắc: nếu thiếu document cũ, ta cảnh báo lỗi
        throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, `Variant _id=${incVar._id} không tìm thấy để cập nhật.`)
      }
      toUpdate.sku = incVar.sku
      toUpdate.price = incVar.price
      toUpdate.stock = incVar.stock
      toUpdate.image = incVar.image
      await toUpdate.save({ session })
      // Chưa xử lý attributes ở đây—sẽ làm chung ở bước 6.6
    }

    // 6.5. Thực hiện chèn (insert) cho các variant mới
    // Tạo mảng document để insert
    const newVariantDocs = variantsToInsert.map((v) => ({
      productId: existingProduct._id,
      sku: v.sku,
      price: v.price,
      stock: v.stock,
      image: v.image
    }))
    let insertedVariants: (mongoose.Document & { _id: mongoose.Types.ObjectId })[] = []
    if (newVariantDocs.length > 0) {
      insertedVariants = await ProductVariantModel.insertMany(newVariantDocs, { session })
    }

    // 6.6. Bây giờ xử lý tiếp phần Attribute + VariantAttribute cho toàn bộ variants (cũ + mới)
    // 6.6.1. Tập hợp tất cả attributes incoming, để upsert vào Attribute collection
    // Tập hợp unique theo slug để tránh trùng lặp
    interface AttrInfo {
      name: string
      slug: string
    }
    const slugToAttrInfo = new Map<string, AttrInfo>()

    productData.variants.forEach((variant) => {
      ;(variant.attributes || []).forEach((attr) => {
        const attrSlug = convertSlugUrl(attr.name)
        if (!slugToAttrInfo.has(attrSlug)) {
          slugToAttrInfo.set(attrSlug, { name: attr.name, slug: attrSlug })
        }
      })
    })

    // 6.6.2. Upsert từng Attribute để đảm bảo có _id cho mỗi slug
    const slugToAttrId = new Map<string, mongoose.Types.ObjectId>()
    for (const [slugAttr, info] of slugToAttrInfo.entries()) {
      const attrDoc = await AttributeModel.findOneAndUpdate(
        { slug: slugAttr },
        { $setOnInsert: { name: info.name, slug: info.slug } },
        { upsert: true, new: true, session }
      )
      slugToAttrId.set(slugAttr, attrDoc._id as mongoose.Types.ObjectId)
    }

    // 6.6.3. Xóa hết VariantAttribute cũ của tất cả variants (cũ lẫn mới) vì chúng sẽ được insert lại hoàn chỉnh
    // Lấy danh sách ID của tất cả variants sau update (variantsToKeep + insertedVariants)
    const finalVariantIds = [
      ...variantsToKeep.map((v) => v._id.toString()),
      ...insertedVariants.map((v) => v._id.toString())
    ].map((id) => new mongoose.Types.ObjectId(id))

    if (finalVariantIds.length > 0) {
      await VariantAttributeModel.deleteMany({ variantId: { $in: finalVariantIds } }, { session })
    }

    // 6.6.4. Build lại mảng variantAttributes mới để insert
    const variantAttributesToInsert: Array<{ variantId: string; attributeId: mongoose.Types.ObjectId; value: string }> =
      []

    // - Với các variants cũ (variantsToUpdate), mỗi object incVar có _id
    for (const incVar of variantsToUpdate) {
      const varId = new mongoose.Types.ObjectId(incVar._id!)
      ;(incVar.attributes || []).forEach((attrVal) => {
        const slugAttr = convertSlugUrl(attrVal.name)
        const attributeId = slugToAttrId.get(slugAttr)!
        variantAttributesToInsert.push({
          variantId: varId.toString(),
          attributeId,
          value: attrVal.value
        })
      })
    }
    // - Với các variants mới (insertedVariants), cần map dựa vào index
    insertedVariants.forEach((doc, idx) => {
      const incVar = variantsToInsert[idx]
      ;(incVar.attributes || []).forEach((attrVal) => {
        const slugAttr = convertSlugUrl(attrVal.name)
        const attributeId = slugToAttrId.get(slugAttr)!
        variantAttributesToInsert.push({
          variantId: doc._id.toString(),
          attributeId,
          value: attrVal.value
        })
      })
    })

    // Cuối cùng insert tất cả
    if (variantAttributesToInsert.length > 0) {
      await VariantAttributeModel.insertMany(variantAttributesToInsert, { session })
    }

    // 7. Commit transaction và kết thúc session
    await session.commitTransaction()
    session.endSession()

    return 'Cập nhật sản phẩm thành công!'
  } catch (error) {
    // 8. Nếu có lỗi, rollback và đóng session, sau đó throw tiếp
    await session.abortTransaction()
    session.endSession()

    // Nếu là ApiError, giữ nguyên message; nếu không, trả về lỗi chung
    if (error instanceof ApiError) {
      throw error
    }
    console.error('handleUpdateProduct error:', error)
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Có lỗi xảy ra trong quá trình cập nhật sản phẩm!')
  }
}

// const handleDeleteProduct = async (productId: string): Promise<any> => {
//   isValidMongoId(productId)

//   const deleted = await ProductModel.deleteById(productId)
//   if (!deleted) {
//     throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để xóa!')
//   }

//   return deleted
// }

const handleDeleteProduct = async (productId: string): Promise<any> => {
  // 1. Bắt đầu một session để thực hiện transaction
  const session = await mongoose.startSession()
  session.startTransaction()

  try {
    // 2. Kiểm tra xem product có tồn tại hay không
    const existingProduct = await ProductModel.findById(productId).session(session)
    if (!existingProduct) {
      // Nếu không tìm thấy, rollback và ném lỗi 404
      await session.abortTransaction()
      session.endSession()
      throw new ApiError(StatusCodes.NOT_FOUND, 'Không tìm thấy sản phẩm để xóa!')
    }

    // 3. Tìm tất cả variants liên quan đến product này
    const variants = await ProductVariantModel.find({ productId: existingProduct._id }).session(session)
    const variantIds = variants.map((v) => v._id)

    // 4. Nếu có variantIds, xóa trước các VariantAttribute liên quan đến những variants đó
    if (variantIds.length > 0) {
      await VariantAttributeModel.deleteMany({ variantId: { $in: variantIds } }, { session })
      // 5. Đến lượt xóa tất cả ProductVariant của product
      await ProductVariantModel.deleteMany({ _id: { $in: variantIds } }, { session })
    }

    // 6. Cuối cùng, xóa chính bản ghi của Product
    await ProductModel.delete({ _id: existingProduct._id }, { session })

    // 7. Nếu tất cả bước trên thành công, commit transaction
    await session.commitTransaction()
    session.endSession()

    // 8. Trả về thông báo thành công
    return { message: 'Xóa sản phẩm và các biến thể thành công!' }
  } catch (error) {
    // 9. Nếu có lỗi bất kỳ, rollback và ném tiếp lỗi
    await session.abortTransaction()
    session.endSession()

    if (error instanceof ApiError) {
      throw error
    }
    console.error('handleDeleteProduct error:', error)
    throw new ApiError(StatusCodes.INTERNAL_SERVER_ERROR, 'Có lỗi xảy ra trong quá trình xóa sản phẩm!')
  }
}

export const productService = {
  handleCreateProduct,
  handleFetchAllProduct,
  handleFetchInfoProduct,
  handleUpdateProduct,
  handleDeleteProduct
}

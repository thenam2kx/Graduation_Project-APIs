/**
 * Utility functions để sanitize input và tránh các lỗ hổng bảo mật
 */

/**
 * Escape các ký tự đặc biệt trong regex để tránh NoSQL injection
 * @param input - Chuỗi input cần escape
 * @returns Chuỗi đã được escape
 */
export const escapeRegexSpecialChars = (input: string): string => {
  if (!input || typeof input !== 'string') {
    return ''
  }
  
  // Escape tất cả ký tự đặc biệt của regex
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

/**
 * Sanitize search query để tránh injection attacks
 * @param query - Query string cần sanitize
 * @returns Query string đã được sanitize
 */
export const sanitizeSearchQuery = (query: string): string => {
  if (!query || typeof query !== 'string') {
    return ''
  }
  
  // Trim và giới hạn độ dài
  const trimmed = query.trim()
  if (trimmed.length > 255) {
    return trimmed.substring(0, 255)
  }
  
  // Escape regex special characters
  return escapeRegexSpecialChars(trimmed)
}

/**
 * Validate MongoDB ObjectId
 * @param id - ID cần validate
 * @returns true nếu ID hợp lệ
 */
export const isValidObjectId = (id: string): boolean => {
  if (!id || typeof id !== 'string') {
    return false
  }
  
  return /^[0-9a-fA-F]{24}$/.test(id)
}

/**
 * Sanitize pagination parameters
 * @param current - Trang hiện tại
 * @param pageSize - Kích thước trang
 * @returns Object chứa current và pageSize đã được sanitize
 */
export const sanitizePagination = (current?: string | number, pageSize?: string | number) => {
  const parsedCurrent = typeof current === 'string' ? parseInt(current, 10) : current
  const parsedPageSize = typeof pageSize === 'string' ? parseInt(pageSize, 10) : pageSize
  
  return {
    current: Math.max(1, parsedCurrent || 1),
    pageSize: Math.min(100, Math.max(1, parsedPageSize || 10))
  }
}
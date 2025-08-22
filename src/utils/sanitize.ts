import { FilterQuery } from 'mongoose'

const DANGEROUS_OPERATORS = [
  '$where', '$regex', '$expr', '$jsonSchema', '$mod', '$text', '$geoIntersects',
  '$geoWithin', '$near', '$nearSphere', '$all', '$elemMatch', '$size'
]

const DANGEROUS_OPERATORS_SET = new Set(DANGEROUS_OPERATORS)

export const sanitizeFilter = <T>(filter: FilterQuery<T>): FilterQuery<T> => {
  if (!filter || typeof filter !== 'object') return {}
  
  const sanitized = { ...filter }
  
  // Remove dangerous operators
  DANGEROUS_OPERATORS_SET.forEach(op => {
    if (sanitized[op]) {
      delete sanitized[op]
    }
  })
  
  // Sanitize nested objects
  Object.keys(sanitized).forEach(key => {
    if (typeof sanitized[key] === 'object' && sanitized[key] !== null) {
      if (Array.isArray(sanitized[key])) {
        // Keep arrays but sanitize each element
        sanitized[key] = sanitized[key].filter((item: unknown) => 
          typeof item !== 'object' || !DANGEROUS_OPERATORS.some(op => (item as Record<string, unknown>)[op])
        )
      } else {
        // Recursively sanitize nested objects
        sanitized[key] = sanitizeFilter(sanitized[key])
      }
    }
  })
  
  return sanitized
}

export const sanitizeSort = (sort: Record<string, unknown>): Record<string, 1 | -1> => {
  if (!sort || typeof sort !== 'object') return { createdAt: -1 }
  
  const sanitized: Record<string, 1 | -1> = {}
  Object.keys(sort).forEach(key => {
    if (typeof sort[key] === 'number' && (sort[key] === 1 || sort[key] === -1)) {
      sanitized[key] = sort[key] as 1 | -1
    }
  })
  
  return Object.keys(sanitized).length > 0 ? sanitized : { createdAt: -1 }
}

export const sanitizeForLog = (input: string | undefined | null): string => {
  if (!input || typeof input !== 'string') return 'undefined'
  return input.replace(/[\r\n\t]/g, '_').substring(0, 100)
}
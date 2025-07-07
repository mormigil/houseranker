export function logError(context: string, error: any) {
  console.error(`[${context}] Error:`, {
    message: error?.message || 'Unknown error',
    details: error?.details || 'No details',
    hint: error?.hint || 'No hint',
    code: error?.code || 'No code',
    fullError: error
  })
}
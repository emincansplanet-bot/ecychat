/**
 * Next loads this for both Node and Edge (e.g. alongside middleware).
 * Do not import fs, child_process, prisma, or any Node-only modules here —
 * that causes Turbopack to emit __import_unsupported in the Edge bundle.
 */
export function register() {}

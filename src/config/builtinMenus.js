const SECTION_ORDER = {
  ai: 0,
  knowledge: 1,
  logs: 2,
  permission: 3
}

export const BUILTIN_HOME_MENU = Object.freeze({
  id: 'builtin-home',
  name: '首页',
  code: 'HOME',
  section: 'permission',
  path: '/home',
  parentId: 104,
  sortOrder: 5,
  status: 1,
  remark: '当前系统介绍页',
  roleIds: [],
  roleNames: [],
  createdAt: null,
  updatedAt: null,
  builtin: true
})

function normalizeText(value) {
  return String(value || '').trim()
}

function getSectionRank(value) {
  return SECTION_ORDER[normalizeText(value)] ?? Number.MAX_SAFE_INTEGER
}

function compareMenus(left, right) {
  const leftParent = left?.parentId == null ? '' : String(left.parentId)
  const rightParent = right?.parentId == null ? '' : String(right.parentId)
  const parentDiff = leftParent.localeCompare(rightParent)
  if (parentDiff !== 0) {
    return parentDiff
  }

  const sectionDiff = getSectionRank(left?.section) - getSectionRank(right?.section)
  if (sectionDiff !== 0) {
    return sectionDiff
  }

  const sortDiff = Number(left?.sortOrder ?? 0) - Number(right?.sortOrder ?? 0)
  if (sortDiff !== 0) {
    return sortDiff
  }

  const pathDiff = normalizeText(left?.path).localeCompare(normalizeText(right?.path))
  if (pathDiff !== 0) {
    return pathDiff
  }

  return normalizeText(left?.name).localeCompare(normalizeText(right?.name))
}

export function isBuiltInMenuPath(path) {
  return normalizeText(path) === BUILTIN_HOME_MENU.path
}

export function isBuiltInMenu(menu) {
  return (
    menu?.id === BUILTIN_HOME_MENU.id ||
    normalizeText(menu?.code).toUpperCase() === BUILTIN_HOME_MENU.code ||
    isBuiltInMenuPath(menu?.path)
  )
}

export function mergeBuiltInMenus(items = []) {
  const list = Array.isArray(items) ? items.map((item) => ({ ...item })) : []

  if (!list.some((item) => isBuiltInMenu(item))) {
    list.push({ ...BUILTIN_HOME_MENU })
  }

  return list.sort(compareMenus)
}

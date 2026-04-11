/**
 * buildTreeStructure.js
 * Converts flat GitHub file tree into nested node structure for visualization
 */

export function buildTreeStructure(flatTree) {
  const root = { name: 'root', path: '', type: 'tree', children: [], isRoot: true };
  const nodeMap = { '': root };

  // Sort so directories come before files
  const sorted = [...flatTree].sort((a, b) => {
    if (a.type !== b.type) return a.type === 'tree' ? -1 : 1;
    return a.path.localeCompare(b.path);
  });

  sorted.forEach(item => {
    const parts = item.path.split('/');
    const name = parts[parts.length - 1];
    const parentPath = parts.slice(0, -1).join('/');

    const node = {
      name,
      path: item.path,
      type: item.type, // 'blob' | 'tree'
      sha: item.sha,
      size: item.size,
      children: [],
      extension: item.type === 'blob' ? name.split('.').pop()?.toLowerCase() : null,
    };

    nodeMap[item.path] = node;

    const parent = nodeMap[parentPath];
    if (parent) {
      parent.children.push(node);
    }
  });

  return root;
}

// Categorize top-level directories for the architecture map
export function categorizeDirectories(treeNode) {
  const CATEGORY_MAP = {
    src: 'source',
    source: 'source',
    lib: 'source',
    app: 'source',
    pages: 'source',
    components: 'source',
    views: 'source',
    modules: 'source',
    features: 'source',
    core: 'source',
    hooks: 'source',
    utils: 'source',
    helpers: 'source',
    services: 'source',
    api: 'source',
    routes: 'source',
    controllers: 'source',
    models: 'source',
    
    tests: 'tests',
    test: 'tests',
    __tests__: 'tests',
    spec: 'tests',
    e2e: 'tests',
    
    docs: 'docs',
    doc: 'docs',
    documentation: 'docs',
    wiki: 'docs',
    
    config: 'config',
    configs: 'config',
    '.github': 'config',
    '.husky': 'config',
    scripts: 'config',
    
    public: 'assets',
    assets: 'assets',
    static: 'assets',
    images: 'assets',
    img: 'assets',
    icons: 'assets',
    fonts: 'assets',
    
    node_modules: 'deps',
    vendor: 'deps',
    '.next': 'build',
    dist: 'build',
    build: 'build',
    out: 'build',
  };

  const CATEGORY_STYLE = {
    source: { color: '#bc8cff', bg: 'rgba(188,140,255,0.1)', border: 'rgba(188,140,255,0.3)', label: 'Source' },
    tests: { color: '#2ea043', bg: 'rgba(46,160,67,0.1)', border: 'rgba(46,160,67,0.3)', label: 'Tests' },
    docs: { color: '#58a6ff', bg: 'rgba(88,166,255,0.1)', border: 'rgba(88,166,255,0.3)', label: 'Docs' },
    config: { color: '#d29922', bg: 'rgba(210,153,34,0.1)', border: 'rgba(210,153,34,0.3)', label: 'Config' },
    assets: { color: '#f78166', bg: 'rgba(247,129,102,0.1)', border: 'rgba(247,129,102,0.3)', label: 'Assets' },
    deps: { color: '#484f58', bg: 'rgba(72,79,88,0.1)', border: 'rgba(72,79,88,0.3)', label: 'Deps' },
    build: { color: '#30363d', bg: 'rgba(48,54,61,0.1)', border: 'rgba(48,54,61,0.3)', label: 'Build' },
    other: { color: '#7d8590', bg: 'rgba(125,133,144,0.1)', border: 'rgba(125,133,144,0.3)', label: 'Other' },
  };

  return treeNode.children.map(child => {
    const category = CATEGORY_MAP[child.name.toLowerCase()] || 'other';
    return {
      ...child,
      category,
      style: CATEGORY_STYLE[category] || CATEGORY_STYLE.other,
    };
  });
}

// File extension → icon + color mapping
export const FILE_ICON_MAP = {
  // Web
  jsx: { icon: 'FileCode', color: '#61dafb' },
  tsx: { icon: 'FileCode', color: '#3178c6' },
  ts: { icon: 'FileCode', color: '#3178c6' },
  js: { icon: 'FileCode', color: '#f7df1e' },
  mjs: { icon: 'FileCode', color: '#f7df1e' },
  cjs: { icon: 'FileCode', color: '#f7df1e' },
  // Styles
  css: { icon: 'Palette', color: '#264de4' },
  scss: { icon: 'Palette', color: '#cc6699' },
  less: { icon: 'Palette', color: '#1d365d' },
  // Markup
  html: { icon: 'Code', color: '#e34c26' },
  svelte: { icon: 'Zap', color: '#ff3e00' },
  vue: { icon: 'Zap', color: '#42b883' },
  // Server
  py: { icon: 'Terminal', color: '#3572A5' },
  rs: { icon: 'Terminal', color: '#ce7224' },
  go: { icon: 'Terminal', color: '#00add8' },
  java: { icon: 'Coffee', color: '#b07219' },
  kt: { icon: 'Terminal', color: '#A97BFF' },
  rb: { icon: 'Gem', color: '#cc342d' },
  php: { icon: 'Server', color: '#777bb4' },
  cs: { icon: 'Code', color: '#512BD4' },
  // Data
  json: { icon: 'Database', color: '#f7df1e' },
  yaml: { icon: 'Settings', color: '#ef4444' },
  yml: { icon: 'Settings', color: '#ef4444' },
  toml: { icon: 'Settings', color: '#9ca3af' },
  env: { icon: 'Key', color: '#d29922' },
  // Docs
  md: { icon: 'FileText', color: '#7d8590' },
  mdx: { icon: 'FileText', color: '#7d8590' },
  txt: { icon: 'File', color: '#9ca3af' },
  // Config
  gitignore: { icon: 'EyeOff', color: '#f85149' },
  dockerfile: { icon: 'Box', color: '#2496ed' },
  // Default
  default: { icon: 'File', color: '#7d8590' },
};

export function getFileIcon(extension) {
  return FILE_ICON_MAP[extension?.toLowerCase()] || FILE_ICON_MAP.default;
}

export function getComplexity(fileCount) {
  if (fileCount < 50) return 'small';
  if (fileCount < 300) return 'medium';
  return 'large';
}

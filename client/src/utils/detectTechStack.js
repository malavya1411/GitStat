/**
 * detectTechStack.js
 * Scans a flat GitHub file tree and returns a structured TechStack object
 */

const FRAMEWORK_MAP = {
  react: { name: 'React', color: '#61dafb', bg: 'rgba(97,218,251,0.12)', icon: 'React' },
  next: { name: 'Next.js', color: '#ffffff', bg: 'rgba(255,255,255,0.08)', icon: 'Next' },
  vue: { name: 'Vue', color: '#42b883', bg: 'rgba(66,184,131,0.12)', icon: 'Vue' },
  nuxt: { name: 'Nuxt', color: '#00dc82', bg: 'rgba(0,220,130,0.12)', icon: 'Nuxt' },
  angular: { name: 'Angular', color: '#dd0031', bg: 'rgba(221,0,49,0.12)', icon: 'NG' },
  svelte: { name: 'Svelte', color: '#ff3e00', bg: 'rgba(255,62,0,0.12)', icon: 'Svelte' },
  vite: { name: 'Vite', color: '#a855f7', bg: 'rgba(168,85,247,0.12)', icon: 'Vite' },
  express: { name: 'Express', color: '#68d391', bg: 'rgba(104,211,145,0.12)', icon: 'Ex' },
  fastapi: { name: 'FastAPI', color: '#009688', bg: 'rgba(0,150,136,0.12)', icon: 'API' },
  django: { name: 'Django', color: '#092e20', bg: 'rgba(9,46,32,0.3)', icon: 'DJ' },
  flask: { name: 'Flask', color: '#ffffff', bg: 'rgba(255,255,255,0.08)', icon: 'Flask' },
  'spring boot': { name: 'Spring Boot', color: '#6db33f', bg: 'rgba(109,179,63,0.12)', icon: 'Spring' },
  nestjs: { name: 'NestJS', color: '#e0234e', bg: 'rgba(224,35,78,0.12)', icon: 'Nest' },
  prisma: { name: 'Prisma', color: '#2d3748', bg: 'rgba(45,55,72,0.3)', icon: 'DB' },
  drizzle: { name: 'Drizzle', color: '#c5f74f', bg: 'rgba(197,247,79,0.12)', icon: 'ORM' },
  tailwindcss: { name: 'Tailwind CSS', color: '#38bdf8', bg: 'rgba(56,189,248,0.12)', icon: 'CSS' },
  trpc: { name: 'tRPC', color: '#398ccb', bg: 'rgba(57,140,203,0.12)', icon: 'RPC' },
};

const LANG_MAP = {
  typescript: { name: 'TypeScript', color: '#3178c6', bg: 'rgba(49,120,198,0.12)', icon: 'TS' },
  javascript: { name: 'JavaScript', color: '#f7df1e', bg: 'rgba(247,223,30,0.12)', icon: 'JS' },
  python: { name: 'Python', color: '#3572A5', bg: 'rgba(53,114,165,0.12)', icon: 'PY' },
  rust: { name: 'Rust', color: '#ce7224', bg: 'rgba(206,114,36,0.12)', icon: 'RS' },
  go: { name: 'Go', color: '#00add8', bg: 'rgba(0,173,216,0.12)', icon: 'GO' },
  java: { name: 'Java', color: '#b07219', bg: 'rgba(176,114,25,0.12)', icon: 'JV' },
  kotlin: { name: 'Kotlin', color: '#A97BFF', bg: 'rgba(169,123,255,0.12)', icon: 'KT' },
  ruby: { name: 'Ruby', color: '#cc342d', bg: 'rgba(204,52,45,0.12)', icon: 'RB' },
  csharp: { name: 'C#', color: '#512BD4', bg: 'rgba(81,43,212,0.12)', icon: 'C#' },
  php: { name: 'PHP', color: '#777bb4', bg: 'rgba(119,123,180,0.12)', icon: 'PHP' },
  swift: { name: 'Swift', color: '#ff6b35', bg: 'rgba(255,107,53,0.12)', icon: 'SW' },
};

const TOOL_MAP = {
  docker: { name: 'Docker', color: '#2496ed', bg: 'rgba(36,150,237,0.12)', icon: 'Docker' },
  kubernetes: { name: 'Kubernetes', color: '#326ce5', bg: 'rgba(50,108,229,0.12)', icon: 'K8s' },
  terraform: { name: 'Terraform', color: '#844fba', bg: 'rgba(132,79,186,0.12)', icon: 'IaC' },
  github_actions: { name: 'GitHub Actions', color: '#2088ff', bg: 'rgba(32,136,255,0.12)', icon: 'CI' },
  testing: { name: 'Tests', color: '#2ea043', bg: 'rgba(46,160,67,0.12)', icon: 'TEST' },
  graphql: { name: 'GraphQL', color: '#e10098', bg: 'rgba(225,0,152,0.12)', icon: 'GQL' },
  redis: { name: 'Redis', color: '#dc382d', bg: 'rgba(220,56,45,0.12)', icon: 'Redis' },
};

const PKG_MANAGER_MAP = {
  pnpm: { name: 'pnpm', color: '#f69220', bg: 'rgba(246,146,32,0.12)', icon: 'PNPM' },
  yarn: { name: 'Yarn', color: '#2c8ebb', bg: 'rgba(44,142,187,0.12)', icon: 'Yarn' },
  npm: { name: 'npm', color: '#cb3837', bg: 'rgba(203,56,55,0.12)', icon: 'NPM' },
  pip: { name: 'pip', color: '#3572A5', bg: 'rgba(53,114,165,0.12)', icon: 'PIP' },
  poetry: { name: 'Poetry', color: '#60a5fa', bg: 'rgba(96,165,250,0.12)', icon: 'Poetry' },
  cargo: { name: 'Cargo', color: '#ce7224', bg: 'rgba(206,114,36,0.12)', icon: 'Cargo' },
  gomod: { name: 'Go Modules', color: '#00add8', bg: 'rgba(0,173,216,0.12)', icon: 'GoMod' },
  maven: { name: 'Maven', color: '#c71a36', bg: 'rgba(199,26,54,0.12)', icon: 'Maven' },
  gradle: { name: 'Gradle', color: '#02303a', bg: 'rgba(2,48,58,0.3)', icon: 'Gradle' },
};

export function detectTechStack(fileTree, packageJsonContent = null) {
  const paths = fileTree.map(f => f.path.toLowerCase());
  const result = {
    languages: [],
    frameworks: [],
    tools: [],
    packageManager: null,
    hasTests: false,
    hasDocker: false,
    hasCI: false,
    hasIaC: false,
    hasEnvExample: false,
    hasContributing: false,
    installCommand: 'npm install',
    devCommand: 'npm run dev',
    buildCommand: 'npm run build',
  };

  // Detect languages by file extension
  const extCounts = {};
  fileTree.forEach(f => {
    const ext = f.path.split('.').pop()?.toLowerCase();
    if (ext) extCounts[ext] = (extCounts[ext] || 0) + 1;
  });

  if (extCounts['ts'] || extCounts['tsx']) result.languages.push(LANG_MAP.typescript);
  else if (extCounts['js'] || extCounts['jsx'] || extCounts['mjs']) result.languages.push(LANG_MAP.javascript);
  if (extCounts['py']) result.languages.push(LANG_MAP.python);
  if (extCounts['rs']) result.languages.push(LANG_MAP.rust);
  if (extCounts['go']) result.languages.push(LANG_MAP.go);
  if (extCounts['java']) result.languages.push(LANG_MAP.java);
  if (extCounts['kt']) result.languages.push(LANG_MAP.kotlin);
  if (extCounts['rb']) result.languages.push(LANG_MAP.ruby);
  if (extCounts['cs']) result.languages.push(LANG_MAP.csharp);
  if (extCounts['php']) result.languages.push(LANG_MAP.php);
  if (extCounts['swift']) result.languages.push(LANG_MAP.swift);

  // Detect package manager
  if (paths.includes('pnpm-lock.yaml')) {
    result.packageManager = PKG_MANAGER_MAP.pnpm;
    result.installCommand = 'pnpm install';
    result.devCommand = 'pnpm dev';
  } else if (paths.includes('yarn.lock')) {
    result.packageManager = PKG_MANAGER_MAP.yarn;
    result.installCommand = 'yarn';
    result.devCommand = 'yarn dev';
  } else if (paths.includes('package-lock.json') || paths.includes('package.json')) {
    result.packageManager = PKG_MANAGER_MAP.npm;
  } else if (paths.includes('poetry.lock')) {
    result.packageManager = PKG_MANAGER_MAP.poetry;
    result.installCommand = 'poetry install';
    result.devCommand = 'poetry run python main.py';
  } else if (paths.some(p => p === 'requirements.txt')) {
    result.packageManager = PKG_MANAGER_MAP.pip;
    result.installCommand = 'pip install -r requirements.txt';
    result.devCommand = 'python main.py';
  } else if (paths.includes('cargo.toml')) {
    result.packageManager = PKG_MANAGER_MAP.cargo;
    result.installCommand = 'cargo build';
    result.devCommand = 'cargo run';
  } else if (paths.includes('go.mod')) {
    result.packageManager = PKG_MANAGER_MAP.gomod;
    result.installCommand = 'go mod download';
    result.devCommand = 'go run .';
  } else if (paths.some(p => p === 'pom.xml')) {
    result.packageManager = PKG_MANAGER_MAP.maven;
    result.installCommand = 'mvn install';
    result.devCommand = 'mvn spring-boot:run';
  } else if (paths.some(p => p.endsWith('build.gradle'))) {
    result.packageManager = PKG_MANAGER_MAP.gradle;
    result.installCommand = './gradlew build';
    result.devCommand = './gradlew bootRun';
  }

  // Detect frameworks from package.json
  if (packageJsonContent) {
    try {
      const pkg = typeof packageJsonContent === 'string' 
        ? JSON.parse(packageJsonContent) 
        : packageJsonContent;
      const allDeps = { ...pkg.dependencies, ...pkg.devDependencies };
      const depNames = Object.keys(allDeps).map(d => d.toLowerCase());
      
      const fwChecks = [
        ['react', ['react', 'react-dom']],
        ['next', ['next']],
        ['vue', ['vue']],
        ['nuxt', ['nuxt']],
        ['angular', ['@angular/core']],
        ['svelte', ['svelte']],
        ['vite', ['vite']],
        ['express', ['express']],
        ['nestjs', ['@nestjs/core']],
        ['prisma', ['prisma', '@prisma/client']],
        ['drizzle', ['drizzle-orm']],
        ['tailwindcss', ['tailwindcss']],
        ['trpc', ['@trpc/server', '@trpc/client']],
        ['graphql', ['graphql', 'apollo-server', 'apollo-client']],
        ['redis', ['redis', 'ioredis']],
      ];
      
      fwChecks.forEach(([key, packages]) => {
        if (packages.some(p => depNames.includes(p))) {
          if (FRAMEWORK_MAP[key]) result.frameworks.push(FRAMEWORK_MAP[key]);
          if (TOOL_MAP[key]) result.tools.push(TOOL_MAP[key]);
        }
      });

      // Detect dev command from scripts
      if (pkg.scripts) {
        if (pkg.scripts.dev) result.devCommand = 'npm run dev';
        else if (pkg.scripts.start) result.devCommand = 'npm start';
        if (pkg.scripts.build) result.buildCommand = 'npm run build';
      }
    } catch (e) { /* ignore parse errors */ }
  }

  // Detect Python frameworks from file tree
  if (paths.some(p => p.includes('requirements.txt') || p.endsWith('.py'))) {
    // Try to detect framework without file content (limited)
    if (paths.some(p => p.includes('manage.py') || p.includes('django'))) {
      result.frameworks.push(FRAMEWORK_MAP.django);
    } else if (paths.some(p => p.includes('app.py') || p.includes('flask'))) {
      result.frameworks.push(FRAMEWORK_MAP.flask);
    } else if (paths.some(p => p.includes('main.py') || p.includes('fastapi'))) {
      result.frameworks.push(FRAMEWORK_MAP.fastapi);
    }
  }

  // Detect tools
  if (paths.some(p => p.includes('dockerfile') || p.endsWith('.dockerfile'))) {
    result.hasDocker = true;
    result.tools.push(TOOL_MAP.docker);
  }
  if (paths.some(p => p.includes('kubernetes') || p.includes('k8s') || p.endsWith('.yaml') && p.includes('deploy'))) {
    result.tools.push(TOOL_MAP.kubernetes);
  }
  if (paths.some(p => p.includes('.github/workflows'))) {
    result.hasCI = true;
    result.tools.push(TOOL_MAP.github_actions);
  }
  if (paths.some(p => p.includes('terraform') || p.endsWith('.tf'))) {
    result.hasIaC = true;
    result.tools.push(TOOL_MAP.terraform);
  }
  if (paths.some(p => p.includes('__tests__') || p.includes('.test.') || p.includes('.spec.') || p.includes('test/'))) {
    result.hasTests = true;
    result.tools.push(TOOL_MAP.testing);
  }

  // Special file flags
  result.hasEnvExample = paths.some(p => p.includes('.env.example') || p === '.env.example');
  result.hasContributing = paths.some(p => p.toLowerCase().includes('contributing'));

  return result;
}

export { FRAMEWORK_MAP, LANG_MAP, TOOL_MAP, PKG_MANAGER_MAP };

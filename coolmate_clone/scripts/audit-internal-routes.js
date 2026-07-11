const fs = require('fs');
const path = require('path');
const {
  COLLECTION_PAGES,
  INFO_PAGES,
  SITE_CONFIG,
  USED_DATA_FILES,
  buildEntries,
  getGeneratedRoutes,
  normalizeRoute,
} = require('../route-manifest.js');

const ROOT_DIR = path.resolve(__dirname, '..');
const SRC_DIR = path.join(ROOT_DIR, 'src');
const REPORTS_DIR = path.join(ROOT_DIR, 'reports');
const REPORT_PATH = path.join(REPORTS_DIR, 'internal-route-inventory.json');

const INCLUDE_RE = /{%\s*(?:include|extends)\s+["']([^"']+)["']/g;
const SCRIPT_SRC_RE = /<script[^>]+src=["']([^"']+)["']/g;
const IMPORT_RE = /import\s+(?:[^'"]*from\s+)?['"]([^'"]+)['"]/g;
const REQUIRE_RE = /require\(\s*['"]([^'"]+)['"]\s*\)/g;
const ROUTE_LITERAL_RE = /(['"`])((?:https?:\/\/www\.coolmate\.me)?\/[^'"`\s<>]+)\1/g;

const IGNORED_ROUTE_VALUES = new Set([
  '/favicon.ico',
  '/manifest.json',
  '/product',
  '/collection',
]);

const SPECIAL_DATA_ROUTES = new Set([
  normalizeRoute('/collection/ao-nam/'),
  normalizeRoute('/product/ao-thun-doraemon-cotton-compact-phoi-bo/'),
  normalizeRoute('/cart/'),
]);

function normalizeFsPath(value) {
  return path.normalize(value);
}

function fileExists(filePath) {
  return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
}

function resolveTemplateInclude(currentFile, includePath) {
  if (includePath.startsWith('.')) {
    return normalizeFsPath(path.resolve(path.dirname(currentFile), includePath));
  }

  return normalizeFsPath(path.resolve(SRC_DIR, includePath));
}

function resolveRelativeImport(currentFile, importPath) {
  const withExtension = path.extname(importPath)
    ? importPath
    : `${importPath}.js`;

  return normalizeFsPath(path.resolve(path.dirname(currentFile), withExtension));
}

function shouldIgnoreRoute(rawRoute) {
  const normalized = normalizeRoute(rawRoute);
  if (!normalized) {
    return true;
  }

  if (IGNORED_ROUTE_VALUES.has(normalized)) {
    return true;
  }

  if (normalized.startsWith('/_next/')) {
    return true;
  }

  if (normalized.startsWith('/image/')) {
    return true;
  }

  return Boolean(path.extname(normalized));
}

function classifyRoute(route) {
  if (route === '/') {
    return 'root';
  }

  const segments = route.split('/').filter(Boolean);
  const [firstSegment] = segments;

  if (firstSegment === 'collection') {
    return 'collection';
  }

  if (firstSegment === 'product') {
    return 'product';
  }

  if (firstSegment === 'page') {
    return 'page';
  }

  if (firstSegment === 'lp') {
    return 'lp';
  }

  if (segments.length === 1) {
    return 'top-level';
  }

  return 'nested';
}

function getLineNumber(content, index) {
  return content.slice(0, index).split(/\r?\n/).length;
}

function scanFileGraph() {
  const visited = new Set();
  const queue = [];

  Object.values(buildEntries()).forEach((entry) => {
    queue.push(normalizeFsPath(path.resolve(ROOT_DIR, entry.import)));
  });

  USED_DATA_FILES.forEach((filePath) => {
    queue.push(normalizeFsPath(path.resolve(ROOT_DIR, filePath)));
  });

  while (queue.length > 0) {
    const currentFile = queue.shift();
    if (visited.has(currentFile) || !fileExists(currentFile)) {
      continue;
    }

    visited.add(currentFile);
    const content = fs.readFileSync(currentFile, 'utf8');
    const extension = path.extname(currentFile);

    if (extension === '.njk' || extension === '.html') {
      for (const match of content.matchAll(INCLUDE_RE)) {
        const resolved = resolveTemplateInclude(currentFile, match[1]);
        if (fileExists(resolved)) {
          queue.push(resolved);
        }
      }

      for (const match of content.matchAll(SCRIPT_SRC_RE)) {
        const scriptSrc = match[1];
        if (!scriptSrc.startsWith('.')) {
          continue;
        }

        const resolved = normalizeFsPath(path.resolve(path.dirname(currentFile), scriptSrc));
        if (fileExists(resolved)) {
          queue.push(resolved);
        }
      }
    }

    if (extension === '.js') {
      for (const match of content.matchAll(IMPORT_RE)) {
        const importPath = match[1];
        if (!importPath.startsWith('.')) {
          continue;
        }

        const resolved = resolveRelativeImport(currentFile, importPath);
        if (fileExists(resolved)) {
          queue.push(resolved);
        }
      }

      for (const match of content.matchAll(REQUIRE_RE)) {
        const requirePath = match[1];
        if (!requirePath.startsWith('.')) {
          continue;
        }

        const resolved = resolveRelativeImport(currentFile, requirePath);
        if (fileExists(resolved)) {
          queue.push(resolved);
        }
      }
    }
  }

  return Array.from(visited).sort();
}

function collectRouteReferences(files) {
  const references = new Map();

  files.forEach((filePath) => {
    const relativeFile = path.relative(ROOT_DIR, filePath).replace(/\\/g, '/');
    const content = fs.readFileSync(filePath, 'utf8');

    for (const match of content.matchAll(ROUTE_LITERAL_RE)) {
      const rawValue = match[2];
      if (shouldIgnoreRoute(rawValue)) {
        continue;
      }

      const normalized = normalizeRoute(rawValue);
      const rawRoute = rawValue.replace(/^https?:\/\/www\.coolmate\.me/i, '');
      const line = getLineNumber(content, match.index);
      const routeType = classifyRoute(normalized);

      if (!references.has(normalized)) {
        references.set(normalized, {
          route: normalized,
          type: routeType,
          count: 0,
          variants: new Set(),
          files: new Map(),
        });
      }

      const entry = references.get(normalized);
      entry.count += 1;
      entry.variants.add(rawRoute);

      if (!entry.files.has(relativeFile)) {
        entry.files.set(relativeFile, new Set());
      }

      entry.files.get(relativeFile).add(line);
    }
  });

  return references;
}

function collectCoverageSummary(references) {
  const generatedRoutes = getGeneratedRoutes();
  const normalizedGeneratedRoutes = generatedRoutes.map((route) => normalizeRoute(route));
  const generatedRouteSet = new Set(normalizedGeneratedRoutes);
  const referencedRoutes = Array.from(references.keys()).sort();

  const declaredCollectionRoutes = new Set(
    COLLECTION_PAGES.map((collection) => normalizeRoute(`/collection/${collection.slug}/`)),
  );
  const declaredInfoRoutes = new Set(
    Object.keys(INFO_PAGES).map((slug) => normalizeRoute(`/${slug}/`)),
  );

  const missingGeneratedRoutes = referencedRoutes.filter((route) => !generatedRouteSet.has(route));
  const unusedGeneratedRoutes = Array.from(new Set(
    normalizedGeneratedRoutes.filter((route) => !references.has(route)),
  )).sort();

  const collectionDataGaps = referencedRoutes.filter((route) => (
    classifyRoute(route) === 'collection'
    && !declaredCollectionRoutes.has(route)
    && !SPECIAL_DATA_ROUTES.has(route)
  ));

  const infoDataGaps = referencedRoutes.filter((route) => {
    const type = classifyRoute(route);
    const canBeInfoRoute = type === 'page' || type === 'lp' || type === 'top-level' || type === 'nested';

    return canBeInfoRoute
      && !generatedRouteSet.has(route)
      && !declaredInfoRoutes.has(route)
      && !SPECIAL_DATA_ROUTES.has(route);
  });

  const missingByType = {};
  missingGeneratedRoutes.forEach((route) => {
    const type = classifyRoute(route);
    if (!missingByType[type]) {
      missingByType[type] = [];
    }

    missingByType[type].push(route);
  });

  Object.keys(missingByType).forEach((type) => {
    missingByType[type].sort();
  });

  return {
    generatedRoutes,
    normalizedGeneratedRoutes,
    referencedRoutes,
    missingGeneratedRoutes,
    unusedGeneratedRoutes,
    declaredCollectionRoutes: Array.from(declaredCollectionRoutes).sort(),
    declaredInfoRoutes: Array.from(declaredInfoRoutes).sort(),
    collectionDataGaps,
    infoDataGaps,
    missingByType,
  };
}

function toSerializableReferences(references) {
  return Array.from(references.values())
    .map((entry) => ({
      route: entry.route,
      type: entry.type,
      count: entry.count,
      variants: Array.from(entry.variants).sort(),
      files: Array.from(entry.files.entries())
        .map(([file, lines]) => ({
          file,
          lines: Array.from(lines).sort((a, b) => a - b),
        }))
        .sort((a, b) => a.file.localeCompare(b.file)),
    }))
    .sort((a, b) => a.route.localeCompare(b.route));
}

function writeReport(report) {
  fs.mkdirSync(REPORTS_DIR, { recursive: true });
  fs.writeFileSync(REPORT_PATH, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
}

function printSummary(report) {
  const { coverage } = report;

  console.log(`Generated routes: ${coverage.generatedRoutes.length}`);
  console.log(`Referenced internal routes: ${coverage.referencedRoutes.length}`);
  console.log(`Missing generated routes: ${coverage.missingGeneratedRoutes.length}`);
  console.log(`Collection refs missing data: ${coverage.collectionDataGaps.length}`);
  console.log(`Info-like refs missing data: ${coverage.infoDataGaps.length}`);

  if (coverage.missingByType.collection?.length) {
    console.log(`Missing collections: ${coverage.missingByType.collection.slice(0, 12).join(', ')}`);
  }

  if (coverage.missingByType.product?.length) {
    console.log(`Missing products: ${coverage.missingByType.product.slice(0, 12).join(', ')}`);
  }

  if (coverage.missingByType['top-level']?.length) {
    console.log(`Missing top-level aliases: ${coverage.missingByType['top-level'].slice(0, 12).join(', ')}`);
  }

  console.log(`Report written: ${path.relative(ROOT_DIR, REPORT_PATH).replace(/\\/g, '/')}`);
}

function main() {
  const files = scanFileGraph();
  const references = collectRouteReferences(files);
  const coverage = collectCoverageSummary(references);
  const report = {
    generatedAt: new Date().toISOString(),
    siteUrl: SITE_CONFIG.siteUrl,
    scannedFileCount: files.length,
    scannedFiles: files.map((filePath) => path.relative(ROOT_DIR, filePath).replace(/\\/g, '/')),
    coverage,
    references: toSerializableReferences(references),
  };

  writeReport(report);
  printSummary(report);
}

main();

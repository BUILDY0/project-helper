const fs = require('node:fs')
const path = require('node:path')

const rootDir = path.resolve(__dirname, '..')
const sourceLogo = path.join(rootDir, 'build', 'icon.png')
const targets = [path.join(rootDir, 'docs', 'public', 'logo.png')]

function formatPath(filePath) {
  return path.relative(rootDir, filePath).replace(/\\/g, '/')
}

function ensureFileExists(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`资源文件不存在：${formatPath(filePath)}`)
  }
}

function copyFile(source, target) {
  fs.mkdirSync(path.dirname(target), { recursive: true })
  fs.copyFileSync(source, target)
  console.log(`[assets] ${formatPath(source)} -> ${formatPath(target)}`)
}

ensureFileExists(sourceLogo)

targets.forEach((target) => copyFile(sourceLogo, target))

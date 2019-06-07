const util = require('util')
const readFile = util.promisify(require('fs').readFile)
const writeFile = util.promisify(require('fs').writeFile)
const loadJsonFile = require('load-json-file')
const get = require('lodash/get')
const isNil = require('lodash/isNil')
const exec = util.promisify(require('child_process').exec)
const getProjectName = require('project-name')

const GITHUB_URL = 'https://github.com/'

/**
 * Clean repository url by removing '.git' and 'git+'
 *
 * @param {string} reposUrl
 */
const cleanReposUrl = reposUrl =>
  reposUrl
    .replace('\n', '')
    .replace('git+', '')
    .replace('.git', '')

/**
 * Create readme file from the given readmeContent
 *
 * @param {string} readmeContent
 */
const createReadme = async readmeContent =>
  await writeFile('README.md', readmeContent)

/**
 * Get template content from the given templatePath
 *
 * @param {string} templatePath
 */
const getTemplate = async templatePath => await readFile(templatePath, 'utf8')

/**
 * Get package.json content
 */
const getPackageJson = async () => {
  try {
    return loadJsonFile('package.json')
  } catch (err) {
    return undefined
  }
}

/**
 * Get repository url from pakage json
 *
 * @param {Object} reposUrl
 */
const getReposUrlFromPackageJson = async packageJson => {
  const reposUrl = get(packageJson, 'repository.url', undefined)
  return isNil(reposUrl) ? undefined : cleanReposUrl(reposUrl)
}

/**
 * Get repository url from git
 */
const getReposUrlFromGit = async () => {
  try {
    const result = await exec('git config --get remote.origin.url')
    return cleanReposUrl(result.stdout)
  } catch (err) {
    return undefined
  }
}

/**
 * Get repository url from package.json or git
 *
 * @param {Object} packageJson
 */
const getReposUrl = async packageJson =>
  (await getReposUrlFromPackageJson(packageJson)) ||
  (await getReposUrlFromGit())

/**
 * Get repository issues url from package.json or git
 *
 * @param {Object} packageJson
 */
const getReposIssuesUrl = async packageJson => {
  let reposIssuesUrl = get(packageJson, 'bugs.url', undefined)

  if (isNil(reposIssuesUrl)) {
    const reposUrl = await getReposUrl()

    if (!isNil(reposUrl)) {
      reposIssuesUrl = `${reposUrl}/issues`
    }
  }

  return reposIssuesUrl
}

/**
 * Check if repository is a Github repository
 *
 * @param {string} repositoryUrl
 */
const isGithubRepository = repositoryUrl => repositoryUrl.includes(GITHUB_URL)

/**
 * Get github username from repository url
 *
 * @param {string} repositoryUrl
 */
const getGithubUsernameFromRepositoryUrl = async repositoryUrl =>
  repositoryUrl.replace(GITHUB_URL, '').split('/')[0]

/**
 * Get project informations from git and package.json
 */
const getProjectInfos = async () => {
  const packageJson = await getPackageJson()
  const name = getProjectName() || undefined
  const description = get(packageJson, 'description', undefined)
  const engines = get(packageJson, 'engines', undefined)
  const author = get(packageJson, 'author', undefined)
  const version = get(packageJson, 'version', undefined)
  const repositoryUrl = await getReposUrl(packageJson)
  const contributingUrl = await getReposIssuesUrl(packageJson)
  const githubUsername =
    !isNil(repositoryUrl) && isGithubRepository(repositoryUrl)
      ? await getGithubUsernameFromRepositoryUrl(repositoryUrl)
      : undefined

  return {
    name,
    description,
    version,
    author,
    repositoryUrl,
    contributingUrl,
    githubUsername,
    engines
  }
}

module.exports = {
  getTemplate,
  createReadme,
  getProjectInfos
}

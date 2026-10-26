import { fail, HttpError } from './common.mjs';

export function githubClient(token, request = fetch) {
  return async (route, method = 'GET', body, accept = 'application/vnd.github+json') => {
    const response = await request('https://api.github.com' + route, {
      method, headers: { Authorization: `Bearer ${token}`, Accept: accept, 'User-Agent': '3dowon-admin', 'X-GitHub-Api-Version': '2022-11-28', ...(body ? { 'Content-Type': 'application/json' } : {}) },
      ...(body ? { body: JSON.stringify(body) } : {}), signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) {
      const message = response.status === 401 ? 'GitHub 로그인이 만료됐어요. 다시 로그인해주세요.' : [409, 422].includes(response.status) ? '다른 변경과 충돌했어요. 새로고침 후 다시 시도해주세요.' : response.status === 403 ? 'GitHub 권한 또는 요청 한도를 확인해주세요.' : 'GitHub 요청을 완료하지 못했어요.';
      throw new HttpError(response.status, message);
    }
    if (accept === 'application/vnd.github.raw+json') return response;
    return response.status === 204 ? null : response.json();
  };
}

export const editablePath = path => /^(content\/(?:works\/[a-z0-9]+(?:-[a-z0-9]+)*|about|cv|lab|site|portfolio|teaching-materials|featured-projects)\.json|admin\/(?:tech|type)-options\.json|assets\/(?:uploads|documents)\/[a-zA-Z0-9._-]+)$/.test(path);

export class Repository {
  constructor(env, token, request = fetch) {
    this.env = env; this.api = githubClient(token, request);
    this.base = `/repos/${env.GITHUB_REPOSITORY}`;
    this.branch = env.DRAFT_BRANCH || 'admin-drafts'; this.main = env.PUBLISH_BRANCH || 'main';
    if (this.branch === this.main) fail(503, '초안 브랜치와 배포 브랜치는 달라야 합니다.');
  }
  async ref(branch) { return (await this.api(`${this.base}/git/ref/heads/${encodeURIComponent(branch)}`)).object.sha; }
  async head() {
    try { return await this.ref(this.branch); }
    catch (error) {
      if (error.status !== 404) throw error;
      const sha = await this.ref(this.main);
      try { await this.api(`${this.base}/git/refs`, 'POST', { ref: `refs/heads/${this.branch}`, sha }); }
      catch (e) { if (e.status !== 422) throw e; }
      return this.ref(this.branch);
    }
  }
  async snapshot() {
    let sha = await this.head();
    const main = await this.ref(this.main);
    if (sha !== main) {
      const comparison = await this.api(`${this.base}/compare/${sha}...${main}`);
      // A local publication can advance main when the online draft has no changes.
      if (comparison.status === 'ahead') {
        await this.api(`${this.base}/git/refs/heads/${encodeURIComponent(this.branch)}`, 'PATCH', { sha: main, force: false });
        sha = main;
      }
    }
    const [owner, name] = this.env.GITHUB_REPOSITORY.split('/');
    const result = await this.api('/graphql', 'POST', {
      query: `query($owner:String!,$name:String!,$content:String!,$tech:String!,$types:String!){repository(owner:$owner,name:$name){content:object(expression:$content){... on Tree{entries{name object{... on Blob{text} ... on Tree{entries{name object{... on Blob{text}}}}}}}} tech:object(expression:$tech){... on Blob{text}} types:object(expression:$types){... on Blob{text}}}}`,
      variables: { owner, name, content: `${sha}:content`, tech: `${sha}:admin/tech-options.json`, types: `${sha}:admin/type-options.json` },
    });
    if (result.errors || !result.data?.repository?.content?.entries) fail(502, 'GitHub 콘텐츠를 읽지 못했어요.');
    const files = new Map();
    for (const entry of result.data.repository.content.entries) {
      if (entry.name === 'works') for (const work of entry.object.entries || []) {
        const key = `content/works/${work.name}`; if (editablePath(key) && typeof work.object.text === 'string') files.set(key, work.object.text);
      }
      else if (editablePath('content/' + entry.name) && typeof entry.object.text === 'string') files.set('content/' + entry.name, entry.object.text);
    }
    for (const [alias, file] of [['tech', 'tech-options.json'], ['types', 'type-options.json']]) if (typeof result.data.repository[alias]?.text === 'string') files.set('admin/' + file, result.data.repository[alias].text);
    return { sha, files };
  }
  async save(sha, changes, message = 'Save content from online admin') {
    if (!changes.size) return sha;
    const tree = [];
    for (const [path, value] of changes) {
      if (!editablePath(path)) fail(400, '수정할 수 없는 파일입니다.');
      if (value === null) tree.push({ path, mode: '100644', type: 'blob', sha: null });
      else if (typeof value === 'string') tree.push({ path, mode: '100644', type: 'blob', content: value });
      else {
        const blob = await this.api(`${this.base}/git/blobs`, 'POST', { content: value.base64, encoding: 'base64' });
        tree.push({ path, mode: '100644', type: 'blob', sha: blob.sha });
      }
    }
    const parent = await this.api(`${this.base}/git/commits/${sha}`);
    const newTree = await this.api(`${this.base}/git/trees`, 'POST', { base_tree: parent.tree.sha, tree });
    const commit = await this.api(`${this.base}/git/commits`, 'POST', { message, tree: newTree.sha, parents: [sha] });
    // Never force: a simultaneous save creates a sibling commit and must fail.
    await this.api(`${this.base}/git/refs/heads/${encodeURIComponent(this.branch)}`, 'PATCH', { sha: commit.sha, force: false });
    return commit.sha;
  }
  async publish() {
    const draft = await this.head(), main = await this.ref(this.main);
    if (draft === main) return { ok: true, deployed: false, message: '변경사항이 없어요.' };
    const comparison = await this.api(`${this.base}/compare/${main}...${draft}`);
    if (comparison.status !== 'ahead') fail(409, '로컬에서 배포한 내용과 온라인 초안이 달라요. 초안을 보존한 상태에서 변경 내용을 병합해야 합니다.');
    await this.api(`${this.base}/git/refs/heads/${encodeURIComponent(this.main)}`, 'PATCH', { sha: draft, force: false });
    return { ok: true, deployed: true, message: 'GitHub에 반영했어요. 홈페이지 배포가 완료되면 공개됩니다.', url: `https://github.com/${this.env.GITHUB_REPOSITORY}/actions` };
  }
  async asset(path) {
    if (!/^assets\/[a-zA-Z0-9_./ -]+$/.test(path) || path.split('/').some(part => part === '..' || part === '.')) fail(400, '올바른 파일 주소가 아닙니다.');
    return this.api(`${this.base}/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(this.branch)}`, 'GET', undefined, 'application/vnd.github.raw+json');
  }
}

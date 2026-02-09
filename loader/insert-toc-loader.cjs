module.exports = function (source) {
  // 先处理 frontmatter
  const frontmatterRegex = /^---\s*\n([\s\S]+?)\n---/;
  const match = source.match(frontmatterRegex);

  if (match) {
    const frontmatter = match[1];
    // 检查是否有 toc 字段，没有则自动添加
    if (!frontmatter.includes('toc:')) {
      source = source.replace(frontmatterRegex, `---\n${frontmatter}\ntoc: content\n---`);
    }
  } else {
    // 如果没有 frontmatter（不包含 '---'），直接加一个默认的 toc
    source = `---\ntoc: content\n---\n${source}`;
  }

  return source;
};

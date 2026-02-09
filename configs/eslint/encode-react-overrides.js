module.exports = {
  rules: {
    // 避免 base 规则和 TS 规则重复
    'no-unused-vars': 'off',
    '@typescript-eslint/no-unused-vars': [
      'error',
      {
        argsIgnorePattern: '^_', // 忽略 _xxx 格式的形参
        varsIgnorePattern: '^_', // 忽略 const/let/var 变量
        caughtErrorsIgnorePattern: '^_', // 忽略 catch ( _e )
      },
    ],
  },
};

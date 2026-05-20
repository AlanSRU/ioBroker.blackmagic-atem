import config from '@iobroker/eslint-config';

export default [
    ...config,
    {
        ignores: ['build/**', 'admin/**', 'test/**', 'node_modules/**', '**/*.js', '**/*.mjs'],
    },
];

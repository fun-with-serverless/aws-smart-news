
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
      maxConcurrency: 1,
      coverage: {
        reporter: ['text', 'json'],
        reportsDirectory: './tests/coverage',
        reportOnFailure: true,
      },
    },
  })
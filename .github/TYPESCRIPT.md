# TypeScript Configuration Guide

This document explains the production-ready TypeScript configuration for this NestJS project.

## 📋 Configuration Files

### `tsconfig.json` - Main Configuration
Primary TypeScript configuration used for development and type-checking.

### `tsconfig.build.json` - Production Build
Optimized configuration for production builds with minimal output.

---

## 🎯 Key Features

### ✅ Full Strict Mode Enabled
```json
"strict": true
```

Includes all strict type-checking options:
- `noImplicitAny`: Catch variables without explicit types
- `strictNullChecks`: Prevent null/undefined bugs
- `strictFunctionTypes`: Stricter function type checking
- `strictBindCallApply`: Type-check bind/call/apply
- `strictPropertyInitialization`: Ensure class properties are initialized
- `noImplicitThis`: Flag implicit 'this' usage
- `alwaysStrict`: Parse in strict mode and emit "use strict"

### 🔍 Additional Safety Checks
- `noUnusedLocals`: Flag unused local variables
- `noUnusedParameters`: Flag unused function parameters  
- `noImplicitReturns`: Ensure all code paths return a value
- `noFallthroughCasesInSwitch`: Prevent switch fallthrough bugs
- `noUncheckedIndexedAccess`: Add undefined to array index access
- `noImplicitOverride`: Require explicit 'override' keyword

### 🚀 Performance Optimizations
```json
"incremental": true,
"tsBuildInfoFile": "./dist/.tsbuildinfo"
```

Enables incremental compilation for faster rebuilds.

### 📦 Module System
```json
"module": "commonjs",
"moduleResolution": "node"
```

Standard Node.js module system for maximum compatibility.

### 🎨 Path Mapping
```json
"baseUrl": ".",
"paths": {
  "@/*": ["src/*"],
  "@config/*": ["src/config/*"],
  "@common/*": ["src/common/*"],
  "@database/*": ["src/database/*"]
}
```

Enables clean imports:
```typescript
// Instead of:
import { UserService } from '../../../user/user.service';

// Use:
import { UserService } from '@/user/user.service';
```

### 🔄 Import Helpers
```json
"importHelpers": true
```

Reduces bundle size by importing TypeScript helpers from `tslib`.

---

## 📊 Compiler Options Reference

### Language and Environment
| Option | Value | Purpose |
|--------|-------|---------|
| `target` | ES2022 | JavaScript version to emit |
| `lib` | ES2022 | Standard library to include |
| `experimentalDecorators` | true | Enable decorators (required for NestJS) |
| `emitDecoratorMetadata` | true | Emit design-type metadata (required for DI) |

### Modules
| Option | Value | Purpose |
|--------|-------|---------|
| `module` | commonjs | Module code generation |
| `moduleResolution` | node | Module resolution strategy |
| `resolveJsonModule` | true | Allow importing .json files |
| `esModuleInterop` | true | Interop with CommonJS modules |

### Emit
| Option | Value | Purpose |
|--------|-------|---------|
| `declaration` | true | Generate .d.ts files |
| `declarationMap` | true | Generate source maps for declarations |
| `sourceMap` | true | Generate source maps for debugging |
| `outDir` | ./dist | Output directory |
| `removeComments` | true | Strip comments from output |
| `newLine` | lf | Use LF line endings |

### Type Checking
| Option | Value | Purpose |
|--------|-------|---------|
| `strict` | true | Enable all strict type checks |
| `noImplicitAny` | true | Error on implicit 'any' |
| `strictNullChecks` | true | Strict null checking |
| `noUnusedLocals` | true | Report unused locals |
| `noUnusedParameters` | true | Report unused parameters |
| `noImplicitReturns` | true | Report missing returns |
| `noFallthroughCasesInSwitch` | true | Report switch fallthrough |

---

## 🛠 Usage Examples

### Type-Safe Imports
```typescript
// Good - explicit types
import { UserService } from '@/user/user.service';

// Better - with path mapping
import { DatabaseService } from '@database/database.service';
import { AppConfig } from '@config/app.config';
```

### Strict Null Checks
```typescript
// ❌ Error: Object is possibly 'undefined'
function getName(user?: User) {
  return user.name;
}

// ✅ Correct: Handle undefined case
function getName(user?: User) {
  return user?.name ?? 'Anonymous';
}
```

### No Implicit Any
```typescript
// ❌ Error: Parameter 'x' implicitly has 'any' type
function double(x) {
  return x * 2;
}

// ✅ Correct: Explicit type annotation
function double(x: number) {
  return x * 2;
}
```

### No Unused Variables
```typescript
// ❌ Error: 'unused' is declared but never used
function example(used: string, unused: string) {
  return used;
}

// ✅ Correct: Prefix with underscore
function example(used: string, _unused: string) {
  return used;
}
```

---

## 🔧 Build Configurations

### Development Build
```bash
pnpm run build
```
Uses `tsconfig.build.json`:
- No source maps
- Removes comments
- Strips internal types
- Fails on errors

### Type Checking Only
```bash
pnpm tsc --noEmit
```
Validates types without emitting files.

### Watch Mode
```bash
pnpm run start:dev
```
Incremental compilation with hot reload.

---

## 📝 Best Practices

### 1. Use Explicit Types
```typescript
// ❌ Avoid
const config = getConfig();

// ✅ Prefer
const config: AppConfig = getConfig();
```

### 2. Enable Strict Mode
Always keep `strict: true` - it catches bugs early.

### 3. Use Path Aliases
```typescript
// ❌ Avoid deep relative imports
import { User } from '../../../database/entities/user';

// ✅ Use path mapping
import { User } from '@database/entities/user';
```

### 4. Type Function Returns
```typescript
// ❌ Implicit return type
function getUser() {
  return db.user.findOne();
}

// ✅ Explicit return type
function getUser(): Promise<User | null> {
  return db.user.findOne();
}
```

### 5. Handle Nulls Safely
```typescript
// ❌ Unsafe
user.profile.avatar.url

// ✅ Safe with optional chaining
user?.profile?.avatar?.url
```

---

## 🚨 Common Errors and Fixes

### Error: `Object is possibly 'undefined'`
**Fix:** Use optional chaining or nullish coalescing
```typescript
const value = user?.name ?? 'default';
```

### Error: `Parameter implicitly has 'any' type`
**Fix:** Add explicit type annotation
```typescript
function process(data: unknown) { ... }
```

### Error: `Property has no initializer`
**Fix:** Initialize in constructor or use `!` assertion
```typescript
class Service {
  private db!: Database; // Will be initialized in onModuleInit
}
```

### Error: `This member must have an 'override' modifier`
**Fix:** Add `override` keyword
```typescript
class Derived extends Base {
  override method() { ... }
}
```

---

## 🔄 Migration from Loose Configuration

If migrating from a less strict config:

1. **Start with core strict options**
   ```json
   "strict": true
   ```

2. **Add unused checks gradually**
   ```json
   "noUnusedLocals": true,
   "noUnusedParameters": true
   ```

3. **Enable advanced checks**
   ```json
   "noUncheckedIndexedAccess": true,
   "noImplicitOverride": true
   ```

4. **Fix errors incrementally**
   - Address one file at a time
   - Use `@ts-expect-error` for temporary fixes
   - Document why strict checking is disabled

---

## 📚 Additional Resources

- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [TSConfig Reference](https://www.typescriptlang.org/tsconfig)
- [NestJS TypeScript Guide](https://docs.nestjs.com/first-steps)
- [Strict Mode Benefits](https://www.typescriptlang.org/docs/handbook/2/basic-types.html#strictness)

---

## 🎓 TypeScript Version

This configuration is optimized for **TypeScript 5.7.3** and follows current best practices.

### Future Compatibility & Deprecation Warnings

**Current Status:** You may see these deprecation warnings in your IDE:

```
Option 'moduleResolution=node10' is deprecated and will stop functioning in TypeScript 7.0
Option 'baseUrl' is deprecated and will stop functioning in TypeScript 7.0
```

**Why these warnings appear:**
- These options are deprecated for TypeScript 7.0 (future release)
- We're on TypeScript 5.7.3, so they work perfectly fine
- Cannot use `ignoreDeprecations: "6.0"` as it causes errors in TS 5.x
- These settings are **required** for current path mapping functionality

**What to do:**
- ✅ **Ignore these warnings** - They don't affect functionality
- ✅ Application compiles with 0 errors
- ✅ All features work as expected
- ⏰ Plan migration when upgrading to TypeScript 7.0

**Future Migration Path (TypeScript 7.0):**
When TypeScript 7.0 is released, you'll need to:
1. Migrate from `baseUrl` + `paths` to package.json `imports` field
2. Update `moduleResolution` to `"bundler"` or `"node16"`
3. Follow official TypeScript migration guide at https://aka.ms/ts6

**Example Future Configuration (TS 7.0+):**
```json
// package.json
{
  "imports": {
    "#/*": "./src/*",
    "#config/*": "./src/config/*",
    "#common/*": "./src/common/*",
    "#database/*": "./src/database/*"
  }
}

// tsconfig.json
{
  "compilerOptions": {
    "moduleResolution": "bundler" // or "node16"
    // No baseUrl or paths needed
  }
}
```

---

## ✅ Production Readiness Checklist

- [x] Strict mode enabled
- [x] All safety checks active
- [x] Path mapping configured
- [x] Incremental builds
- [x] Source maps for debugging
- [x] Type declarations generated
- [x] Import helpers enabled
- [x] Proper exclusions set
- [x] Build-specific config
- [x] ts-node optimization

**Status:** ✅ Production Ready

---

Last Updated: 2025-01-16
TypeScript Version: 5.7.3

# consteval 与 constinit

C++20 引入两个新关键字。

## consteval

`consteval` 指定函数**必须**在编译期求值，无法在运行时调用。

```cpp
consteval int square(int n) {
    return n * n;
}

int main() {
    constexpr int a = square(5);   // OK
    int x = 5;
    // int b = square(x);          // 错误：x 不是编译期常量
    int b = square(5);             // OK：字面量编译期可求值
}
```

与 `constexpr` 的区别：

| | constexpr | consteval |
|--|-----------|-----------|
| 运行时求值 | 允许（参数非编译期常量时） | 不允许 |
| 编译期求值 | 可能 | 必须 |
| 调用方式 | 灵活 | 严格 |
| 用途 | 通用编译期计算 | 强制编译期执行 |

## constinit

`constinit` 保证变量在静态初始化阶段完成初始化，避免静态初始化顺序问题。

```cpp
constinit int global = 42;           // 静态初始化
// constinit int x = rand();         // 错误：不是常量初始化

// constinit 不隐含 const
constinit int g = 100;
g = 200;                             // OK：可修改
```

常用于全局变量：

```cpp
// logger.h
extern constinit int log_level;
inline constinit int log_level = 2;  // 避免 static init order fiasco
```

## 三者对比

| 关键字 | 作用域 | 编译期 | 运行期 | 引入版本 |
|--------|--------|--------|--------|----------|
| `const` | 变量 | 可能 | 可能 | C++98 |
| `constexpr` | 变量/函数 | 可能 | 可能 | C++11 |
| `consteval` | 函数 | 必须 | 不允许 | C++20 |
| `constinit` | 变量 | 必须 | — | C++20 |

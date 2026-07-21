# enum 与 enum class

C++ 有两种枚举：传统 `enum` 和 C++11 的 `enum class`（有作用域枚举）。

## 传统 enum

```cpp
enum Color { RED, GREEN, BLUE };

Color c = RED;

// 问题：名称泄露到外围作用域
enum Flag { RED, BLUE };  // 冲突！RED 已定义

// 问题：隐式转换为整数
int x = RED;  // 允许，无警告
```

## enum class（C++11）

```cpp
enum class Color { RED, GREEN, BLUE };
enum class Flag { RED, BLUE };  // 不冲突，作用域隔离

Color c = Color::RED;           // 必须加作用域
// int x = c;                   // 错误！不能隐式转换
int x = static_cast<int>(c);    // 显式转换
```

优势：
- 限定作用域，防止名称冲突
- 无隐式整数转换（类型安全）
- 可前置声明

## 指定底层类型

```cpp
enum class Color : char { RED, GREEN, BLUE };      // 1 字节
enum class Flag : uint64_t { A, B, C };             // 8 字节
enum OldStyle : int { X, Y, Z };                    // 传统 enum 也可指定
```

默认底层类型：`enum class` 为 `int`，传统 `enum` 由编译器决定。

## 原理

枚举本质是整数常量。编译器检查赋值合法性，运行时无开销（与直接使用整数性能相同）。

```cpp
// Color::RED 编译时被替换为 0，无运行时开销
```

## 建议

- 始终使用 `enum class` 而非传统 `enum`
- 需要位掩码时可用传统 `enum`（或 `enum class` 配合重载运算符）
- 跨平台 API 接口可指定底层类型控制大小

# static_assert

编译期断言，条件不满足时产生编译错误。

## 基本用法

```cpp
static_assert(sizeof(int) == 4, "int must be 4 bytes");
static_assert(std::is_integral_v<T>, "T must be integral");
```

C++17 起可省略消息字符串：

```cpp
static_assert(sizeof(void*) >= 8);
```

## 与模板结合

```cpp
template <typename T>
class Array {
    static_assert(std::is_nothrow_move_constructible_v<T>,
                  "T must be nothrow move constructible");
    // ...
};

template <int N>
void process() {
    static_assert(N > 0, "N must be positive");
    static_assert(N <= 100, "N must not exceed 100");
}
```

## 与 `if constexpr` 配合

```cpp
template <typename T>
void serialize(const T& value) {
    if constexpr (std::is_arithmetic_v<T>) {
        // 直接序列化
    } else if constexpr (std::is_class_v<T>) {
        // 反射序列化
    } else {
        static_assert(false, "Unsupported type");
    }
}
```

## 使用场景

- 检查平台假设（`sizeof`、对齐方式）
- 模板约束（类型要求、大小限制）
- 防止 API 误用
- 编译期配置校验

## 运行时 assert

```cpp
#include <cassert>
assert(ptr != nullptr);   // 运行时检查，发行版可关闭
```

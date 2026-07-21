# 类型萃取

`<type_traits>` 提供编译期类型查询和变换能力。

## 类型查询

```cpp
#include <type_traits>

static_assert(std::is_integral_v<int>);
static_assert(std::is_floating_point_v<double>);
static_assert(std::is_pointer_v<int*>);
static_assert(std::is_class_v<std::string>);
static_assert(std::is_const_v<const int>);
static_assert(std::is_same_v<int, int>);
```

## 类型变换

```cpp
std::remove_const_t<const int>       // int
std::remove_reference_t<int&>        // int
std::add_pointer_t<int>              // int*
std::decay_t<const int&>             // int（去掉引用和 cv 限定）
```

`remove_reference` 是实现 `std::move` 和 `std::forward` 的基础。

## enable_if

SFINAE（Substitution Failure Is Not An Error）的核心工具。

```cpp
// 仅对整数类型启用
template <typename T>
std::enable_if_t<std::is_integral_v<T>, T>
half(T value) {
    return value / 2;
}

// C++17 更简洁的写法
template <typename T>
T half(T value) {
    static_assert(std::is_integral_v<T>);
    return value / 2;
}
```

## is_same_v 与标签分派

```cpp
template <typename T>
void process(T value) {
    if constexpr (std::is_same_v<T, int>)
        std::cout << "int: " << value;
    else if constexpr (std::is_same_v<T, std::string>)
        std::cout << "string: " << value;
}
```

## 常见 trait

| trait | 作用 |
|-------|------|
| `is_integral` | 是否为整数类型 |
| `is_floating_point` | 是否为浮点类型 |
| `is_pointer` | 是否为指针 |
| `is_class` | 是否为类类型 |
| `is_const` | 是否带 const |
| `is_same` | 是否为同一类型 |
| `is_base_of` | 是否为基类关系 |
| `is_constructible` | 是否可构造 |
| `is_nothrow_move_constructible` | 是否 noexcept 移动构造 |
| `enable_if` | 条件启用模板 |
| `conditional` | 编译期三元 |

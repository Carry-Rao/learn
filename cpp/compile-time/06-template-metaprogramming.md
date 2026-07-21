# 模板元编程

模板元编程（TMP）在编译期执行计算，相当于在 C++ 类型系统中编程。

## 编译期值计算

```cpp
// 阶乘
template <int N>
struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};

template <>
struct Factorial<0> {
    static constexpr int value = 1;
};

static_assert(Factorial<5>::value == 120);
```

## 编译期类型选择

```cpp
template <bool Cond, typename T, typename F>
struct If { using type = T; };

template <typename T, typename F>
struct If<false, T, F> { using type = F; };

using type = If<true, int, double>::type;  // int

// 标准库对应：std::conditional_t
using type2 = std::conditional_t<true, int, double>;
```

## SFINAE

Substitution Failure Is Not An Error — 替换失败不是错误，只是从重载集中移除。

```cpp
// 检测类型是否有 begin() 成员
template <typename T>
constexpr auto has_begin_impl(int)
    -> decltype(std::declval<T>().begin(), std::true_type{});

template <typename T>
constexpr std::false_type has_begin_impl(...);

template <typename T>
constexpr bool has_begin_v = decltype(has_begin_impl<T>(0))::value;

static_assert(has_begin_v<std::vector<int>>);   // true
static_assert(!has_begin_v<int>);                // false
```

## void_t（C++17）

简化 SFINAE 检测：

```cpp
template <typename, typename = void>
struct has_value_type : std::false_type {};

template <typename T>
struct has_value_type<T, std::void_t<typename T::value_type>>
    : std::true_type {};

static_assert(has_value_type<std::vector<int>>::value);
```

## constexpr 替代 TMP

C++14 起大多数元编程可以用 `constexpr` 函数替代，更易读：

```cpp
// 编译期阶乘（TMP 风格）
template <int N>
struct Factorial { static constexpr int value = N * Factorial<N-1>::value; };

// 编译期阶乘（constexpr 风格，推荐）
constexpr int factorial(int n) {
    int r = 1;
    for (int i = 2; i <= n; i++) r *= i;
    return r;
}
```

C++17 `if constexpr` 进一步简化了条件分支的模板代码。

## 建议

- 简单的编译期计算用 `constexpr` 函数
- 类型变换用 `<type_traits>`
- 需要在类型上做模式匹配时才用 TMP
- C++20 的 `consteval` 和 `constexpr vector/string` 将进一步减少对 TMP 的依赖

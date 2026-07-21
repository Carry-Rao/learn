# decltype

`decltype` 获取表达式的类型，编译期确定。

## 基本用法

```cpp
int x = 42;
decltype(x) y = x;            // int
decltype(x + 1.5) z;          // double

const int& foo();
decltype(foo()) r = foo();    // const int&（保留引用）
```

## decltype 与 auto

```cpp
// 返回类型后置（trailing return type）
template <typename T, typename U>
auto add(T a, U b) -> decltype(a + b) {
    return a + b;
}

// C++14 起可简写
template <typename T, typename U>
decltype(auto) add(T a, U b) {
    return a + b;
}
```

## decltype 的推导规则

```cpp
int x = 0;
int& ref = x;
const int& cref = x;

decltype(x)      a;    // int（变量名 → 声明类型）
decltype((x))    b;    // int&（表达式 → 左值引用）
decltype(ref)    c;    // int&（变量名 → 引用类型）
decltype(cref)   d;    // const int&

decltype(42)     e;    // int（prvalue → 值类型）
decltype(x + 1)  f;    // int（prvalue）
```

关键区别：`decltype(x)` 与 `decltype((x))` 不同——前者是变量名，后者是表达式。

## declval

`std::declval<T>()` 在 decltype 表达式中生成假想值，用于不求值上下文。

```cpp
// 检查 T 是否有成员函数 foo
template <typename T>
constexpr auto has_foo_impl(int)
    -> decltype(std::declval<T>().foo(), std::true_type{});

// 判断 T::value_type 是否有效
template <typename T>
using value_type_t = decltype(std::declval<T>().value_type);
```

## 典型应用

```cpp
// 完美转发中的返回类型
template <typename F, typename... Args>
decltype(auto) invoke(F&& f, Args&&... args) {
    return std::forward<F>(f)(std::forward<Args>(args)...);
}
```

`decltype(auto)` 保留引用和 cv 限定，比普通 `auto` 更精确。

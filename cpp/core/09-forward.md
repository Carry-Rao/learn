# 完美转发

完美转发解决：**将参数以原始类型（左值/右值、const）传递给下一个函数**。

## 问题

```cpp
template <typename T>
void wrapper(T t) {
    target(t);  // t 永远是左值，丢失了右值信息
}
```

## 引用折叠

C++11 引入右值引用后，引用折叠规则决定 `T&&` 的实际类型：

| `T` 的推导类型 | `T&&` 展开 |
|----------------|-----------|
| `T&` | `T& &&` → `T&` |
| `T&&` | `T&& &&` → `T&&` |
| `T` | `T&&` |

这就是 **万能引用**（forwarding reference）的原理。

## std::forward

`forward` 根据模板参数的条件转发：

- 如果 `T` 是左值引用，返回 `T&`
- 如果 `T` 不是左值引用，返回 `T&&`

```cpp
// 标准库实现（简化）
template <typename T>
constexpr T&& forward(remove_reference_t<T>& t) noexcept {
    return static_cast<T&&>(t);
}

template <typename T>
constexpr T&& forward(remove_reference_t<T>&& t) noexcept {
    static_assert(!is_lvalue_reference_v<T>,
                  "Cannot forward an lvalue as an rvalue");
    return static_cast<T&&>(t);
}
```

## 使用场景

```cpp
template <typename T>
void wrapper(T&& arg) {
    target(std::forward<T>(arg));
    // arg 的左值/右值属性被完美保留
}

// 调用
wrapper(42);                    // T = int,      forward<int>(int&&) → int&&
int x = 10;
wrapper(x);                     // T = int&,     forward<int&>(int&) → int&
const int y = 20;
wrapper(y);                     // T = const int&, forward(...) → const int&
```

## 与 move 的区别

| | `move` | `forward` |
|--|--------|-----------|
| 作用 | 无条件转为右值 | 按原始类型转发 |
| 实现 | `static_cast<T&&>(t)` 始终返回右值引用 | `static_cast<T&&>(t)` 根据 T 决定 |
| 典型参数 | `T&& t` | `T&& t`，但 T 是调用者推导的 |
| 示例 | `move(x)` → 右值引用 | `forward<T>(x)` → 保持 T 的引用属性 |

## emplace_back 的实现

完美转发在 STL 中的典型应用：

```cpp
template <typename... Args>
void emplace_back(Args&&... args) {
    // 直接构造，避免临时对象拷贝
    new (data + size) T(std::forward<Args>(args)...);
    size++;
}
```

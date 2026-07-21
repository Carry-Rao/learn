# noexcept

`noexcept` 声明函数不抛异常，是 C++11 引入的异常规范。

## 两种用法

```cpp
// noexcept 说明符
void func() noexcept;          // 保证不抛异常
void func() noexcept(false);   // 可能抛异常（默认行为）

// noexcept 运算符（编译期检查）
void may_throw();
void never_throw() noexcept;

bool b1 = noexcept(may_throw());    // false
bool b2 = noexcept(never_throw());  // true
```

## 条件 noexcept

模板中根据条件决定是否 noexcept：

```cpp
template <typename T>
void swap(T& a, T& b) noexcept(noexcept(T(std::move(a)))) {
    T tmp = std::move(a);
    a = std::move(b);
    b = std::move(tmp);
}
```

## 为什么需要 noexcept

| 作用 | 说明 |
|------|------|
| 性能优化 | 编译器可以生成更小的异常处理代码 |
| 容器优化 | `vector` 重新分配时，只有 `noexcept` 的移动构造才被使用，否则退化为拷贝 |
| 移动操作 | 移动构造/赋值通常标记 `noexcept` |
| 析构函数 | C++11 起析构函数默认 `noexcept` |

## 移动操作与 noexcept

```cpp
class Buffer {
public:
    Buffer(Buffer&& other) noexcept
        : data(other.data), size(other.size) {
        other.data = nullptr;
    }

    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data;
            data = other.data;
            size = other.size;
            other.data = nullptr;
        }
        return *this;
    }
};
```

## 如果 noexcept 函数抛出异常

程序直接调用 `std::terminate()` 终止，不进行栈展开。这就是为什么 `noexcept` 是一种承诺而非约束。

## noexcept 适用场景

- 移动构造/移动赋值
- `swap`
- 析构函数（默认已是 noexcept）
- 纯计算、不分配资源的函数
- getter / 简单的访问器

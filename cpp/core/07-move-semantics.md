# 移动语义

C++11 引入移动语义，避免不必要的拷贝。核心是 **资源转移** 而非复制。

## 问题

```cpp
std::vector<int> create() {
    std::vector<int> v(1000000);
    return v;  // 传统拷贝开销巨大
}
```

## std::move

`std::move` 不移动任何东西，只是将左值转为右值引用，触发移动操作。

```cpp
std::string a = "hello";
std::string b = std::move(a);  // a 的资源被转移给 b
// a 处于有效但未指定状态（通常为空）
```

## 移动构造函数与移动赋值

```cpp
class Buffer {
    int* data;
    size_t size;
public:
    Buffer(Buffer&& other) noexcept
        : data(other.data), size(other.size) {
        other.data = nullptr;  // 置空源对象，防止析构释放
        other.size = 0;
    }

    Buffer& operator=(Buffer&& other) noexcept {
        if (this != &other) {
            delete[] data;           // 释放已有资源
            data = other.data;
            size = other.size;
            other.data = nullptr;
            other.size = 0;
        }
        return *this;
    }
};
```

## 实现原理

`std::move` 的本质就是 `static_cast`：

```cpp
// 标准库实现（简化）
template <typename T>
constexpr remove_reference_t<T>&& move(T&& t) noexcept {
    return static_cast<remove_reference_t<T>&&>(t);
}
```

配合 `remove_reference`：

```cpp
// 去掉引用，得到原始类型
template <typename T> struct remove_reference      { using type = T; };
template <typename T> struct remove_reference<T&>  { using type = T; };
template <typename T> struct remove_reference<T&&> { using type = T; };

template <typename T>
using remove_reference_t = typename remove_reference<T>::type;
```

无论 `T` 是 `T&`、`T&&` 还是 `T`，`remove_reference<T>::type` 都是 `T`。所以 `move` 始终返回 `T&&`。

## Rule of Five

如果一个类管理资源（如动态内存、文件句柄），那么五个特殊成员函数通常需要同时定义：

1. 析构函数（destructor）
2. 拷贝构造函数（copy constructor）
3. 拷贝赋值运算符（copy assignment）
4. 移动构造函数（move constructor）
5. 移动赋值运算符（move assignment）

如果一个类需要显式定义其中任何一个，大概率五个都需要。

```cpp
class Resource {
    int* data;
    size_t size;
public:
    // 1. 析构
    ~Resource() { delete[] data; }

    // 2. 拷贝构造
    Resource(const Resource& other)
        : data(new int[other.size]), size(other.size) {
        std::copy(other.data, other.data + size, data);
    }

    // 3. 拷贝赋值
    Resource& operator=(const Resource& other) {
        if (this != &other) {
            delete[] data;
            size = other.size;
            data = new int[size];
            std::copy(other.data, other.data + size, data);
        }
        return *this;
    }

    // 4. 移动构造
    Resource(Resource&& other) noexcept
        : data(other.data), size(other.size) {
        other.data = nullptr;
        other.size = 0;
    }

    // 5. 移动赋值
    Resource& operator=(Resource&& other) noexcept {
        if (this != &other) {
            delete[] data;
            data = other.data;
            size = other.size;
            other.data = nullptr;
            other.size = 0;
        }
        return *this;
    }
};
```

如果类不需要自定义资源管理，优先遵循 **Rule of Zero**：让编译器隐式生成所有五个函数，或用标准库组件（`vector`、`string`、`unique_ptr` 等）管理资源。

## noexcept

移动操作通常标记 `noexcept`，保证不抛异常。标准库容器在重新分配时，只有 `noexcept` 的移动构造才会被使用（否则退化为拷贝）。

## 什么时候用

- 实现管理资源的类时提供移动构造/赋值
- 显式转移所有权（配合 `unique_ptr`）
- 返回大型对象（编译器通常做 RVO，不需要手动 move）

# 移动语义

C++11 引入移动语义，避免不必要的拷贝。

## 问题：不必要的拷贝

```cpp
std::vector<int> createVector() {
    std::vector<int> v(1000000);
    return v;  // 传统上会拷贝，移动语义后直接转移所有权
}
```

## std::move

`std::move` 将左值转为右值引用，触发移动而非拷贝。

```cpp
std::string a = "hello";
std::string b = std::move(a);  // a 的资源被转移给 b

std::cout << a;  // a 处于有效但未指定状态（通常为空）
```

## 移动构造函数

```cpp
class Buffer {
private:
    int* data;
    size_t size;

public:
    // 移动构造函数
    Buffer(Buffer&& other) noexcept
        : data(other.data), size(other.size) {
        other.data = nullptr;
        other.size = 0;
    }

    // 移动赋值
    Buffer& operator=(Buffer&& other) noexcept {
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

## noexcept

移动操作通常用 `noexcept` 标记，保证不抛异常，这样标准库容器才会在重新分配时使用移动而非拷贝。

## 什么时候用

- 返回大型对象时（编译器可能做 RVO，不需要手动 move）
- 实现容器或管理资源的类时
- 需要显式转移所有权时

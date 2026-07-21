# std::string 深入

`std::string` 的更多高级操作、原理和简单实现。

## 查找与替换

```cpp
#include <iostream>
#include <string>

int main() {
    std::string s = "Hello World, Hello C++";

    size_t pos = s.find("Hello");
    if (pos != std::string::npos) {
        std::cout << "Found at: " << pos << std::endl;
    }

    pos = s.find("Hello", 5);
    pos = s.rfind("Hello");

    s.replace(0, 5, "Hi");
}
```

## 插入与删除

```cpp
std::string s = "C++";

s.insert(3, " Programming");   // "C++ Programming"
s.erase(4, 4);                 // "C++ gramming"
s.push_back('!');
s.pop_back();
```

## 数字转换

```cpp
#include <string>

int i = std::stoi("42");
double d = std::stod("3.14");
std::string s = std::to_string(42);
```

## 原理：SSO（Small String Optimization）

`std::string` 通常使用 **SSO**（短字符串优化）：小字符串直接存储在栈上，避免堆分配。

```
长度 ≤ 15（GCC/libstdc++）：
[小字符串缓冲区]           ← 栈上
[大小] [容量]

长度 > 15：
[堆内存指针] [大小] [容量]   ← 数据在堆上
```

不同实现的 SSO 阈值：
- libstdc++ (GCC)：15 字节（存储在 `_M_local_buf`）
- libc++ (Clang)：22 字节
- MSVC：16 字节

```cpp
// 简化 SSO 实现
template <typename charT>
class basic_string {
    union {
        charT* ptr_;        // 非 SSO：指向堆内存
        charT buf_[16];     // SSO：栈缓冲区
    };
    size_t size_;
    size_t capacity_;
    bool is_sso() const { return capacity_ < 16; }
};
```

## 简单实现

```cpp
class String {
    char* data_;
    size_t size_;
    size_t capacity_;
public:
    String() : data_(new char[1]{'\0'}), size_(0), capacity_(1) {}

    String(const char* s)
        : size_(strlen(s)), capacity_(size_ + 1)
    {
        data_ = new char[capacity_];
        memcpy(data_, s, size_ + 1);
    }

    String(const String& other)
        : size_(other.size_), capacity_(other.capacity_)
    {
        data_ = new char[capacity_];
        memcpy(data_, other.data_, size_ + 1);
    }

    String& operator=(const String& other) {
        if (this != &other) {
            delete[] data_;
            size_ = other.size_;
            capacity_ = other.capacity_;
            data_ = new char[capacity_];
            memcpy(data_, other.data_, size_ + 1);
        }
        return *this;
    }

    ~String() { delete[] data_; }

    char& operator[](size_t i) { return data_[i]; }
    size_t size() const { return size_; }
    const char* c_str() const { return data_; }
};
```

## std::string_view（C++17）

非拥有视图，零拷贝只读访问，替代 `const std::string&` 作函数参数。

```cpp
#include <string_view>

void process(std::string_view sv) {
    // 无分配开销
}

process("hello");                // 字面量→无分配
std::string s = "world";
process(s);                      // 兼容 std::string
```

```cpp
std::string_view sv = "Hello, World!";

sv.remove_prefix(7);    // "World!"
sv.remove_suffix(1);    // "World"
sv.substr(0, 3);        // "Wor"
sv.find("World");       // 0
sv.starts_with("Wor");  // true（C++20）
```

**注意**：`string_view` 不拥有数据，不保证 `\0` 结尾，注意生命周期。

```cpp
std::string_view bad() {
    std::string s = "temp";
    return s;  // s 析构后 sv 悬垂！
}
```

## 建议

- `find` 返回 `npos` 检查必须做
- 函数参数用 `string_view` 避免不必要的拷贝
- 短字符串 SSO 使 `string` 操作非常快

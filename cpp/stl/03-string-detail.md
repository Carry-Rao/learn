# std::string 深入

`std::string` 的更多高级操作。

## 查找与替换

```cpp
#include <iostream>
#include <string>

int main() {
    std::string s = "Hello World, Hello C++";

    // 查找
    size_t pos = s.find("Hello");
    if (pos != std::string::npos) {
        std::cout << "Found at: " << pos << std::endl;
    }

    // 从指定位置开始查找
    pos = s.find("Hello", 5);  // 从位置 5 开始找

    // 反向查找
    pos = s.rfind("Hello");

    // 替换
    s.replace(0, 5, "Hi");     // 从 0 开始的 5 个字符替换为 "Hi"

}
```

## 插入与删除

```cpp
std::string s = "C++";

s.insert(3, " Programming");   // "C++ Programming"
s.erase(4, 4);                 // "C++ gramming"（删除位置 4 开始的 4 个字符）
s.push_back('!');              // 末尾追加字符
s.pop_back();                  // 删除末尾字符
```

## 数字转换

```cpp
#include <string>

int i = std::stoi("42");            // std::string → int
double d = std::stod("3.14");       // std::string → double
std::string s = std::to_string(42); // int → std::string
```

## 其他方法

```cpp
s.substr(pos, count);   // 取子串
s.compare(other);       // 比较，相等返回 0
s.data();               // 获取 C 风格字符串指针
s.c_str();              // 获取 const char*
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

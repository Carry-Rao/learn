# std::string_view

C++17 引入 `std::string_view`，是字符串的非拥有视图（只读引用），避免拷贝。

## 问题

```cpp
void process(const std::string& s) {
    // 传入字符串字面量会构造 std::string（堆分配）
}

process("hello");  // 隐式构造 std::string，有分配开销
```

## string_view 解决

```cpp
#include <string_view>

void process(std::string_view sv) {
    // 零拷贝，只读访问
}

process("hello");                // 无分配
std::string s = "world";
process(s);                      // 也兼容
process(s.substr(0, 3));         // substr 返回 string_view（C++20）
```

## 常用操作

```cpp
std::string_view sv = "Hello, World!";

sv.size();              // 13
sv[0];                  // 'H'
sv.front();             // 'H'
sv.back();              // '!'
sv.remove_prefix(7);    // 移除前 7 个字符 → "World!"
sv.remove_suffix(1);    // 移除最后 1 个字符 → "World"
sv.substr(0, 5);        // "World"
sv.find("World");       // 0
sv.starts_with("Wor");  // true（C++20）
sv.ends_with("ld");     // true（C++20）
```

## 注意事项

- `string_view` 不拥有数据，不保证字符串以 `\0` 结尾
- 指向的数据必须在使用期间保持有效（注意悬垂引用）
- 不适合需要修改或存储字符串的场合

```cpp
std::string_view dangerous() {
    std::string s = "temp";
    return s;  // s 析构后 sv 悬垂！
}

std::string_view sv = "literal";  // OK：字符串字面量静态存储期
```

## 建议

- 函数参数用 `string_view` 替代 `const std::string&`（字面量场景避免分配）
- 需要存储或修改字符串时仍用 `std::string`
- 注意生命周期管理

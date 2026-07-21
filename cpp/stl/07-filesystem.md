# std::filesystem

C++17 引入 `std::filesystem`，提供跨平台的文件系统操作。

## 路径操作

```cpp
#include <filesystem>
namespace fs = std::filesystem;

int main() {
    fs::path p = "/home/user/example.txt";

    p.root_name();     // "/"
    p.parent_path();   // "/home/user"
    p.filename();      // "example.txt"
    p.stem();          // "example"
    p.extension();     // ".txt"

    p = p.replace_extension(".md");       // "/home/user/example.md"
    p = p.parent_path() / "new" / "file.txt";  // 拼接
}
```

## 目录遍历

```cpp
void list_dir(const fs::path& dir) {
    for (const auto& entry : fs::directory_iterator(dir)) {
        if (entry.is_regular_file())
            std::cout << "FILE: " << entry.path();
        else if (entry.is_directory())
            std::cout << "DIR:  " << entry.path();
    }
}
```

递归遍历：

```cpp
void walk(const fs::path& dir) {
    for (const auto& entry : fs::recursive_directory_iterator(dir)) {
        std::cout << entry.path() << "\n";
    }
}
```

## 文件状态与操作

```cpp
fs::path p = "test.txt";

// 查询
bool exists = fs::exists(p);
bool is_dir  = fs::is_directory(p);
bool is_file = fs::is_regular_file(p);
uintmax_t sz = fs::file_size(p);
auto ftime   = fs::last_write_time(p);

// 操作
fs::copy(src, dst, fs::copy_options::overwrite_existing);
fs::rename(old, new);
fs::remove(path);
fs::remove_all(dir);       // 递归删除
fs::create_directory(dir);
fs::create_directories("a/b/c");  // 创建多级目录
fs::space_info si = fs::space("/");  // 磁盘容量
```

## 错误处理

```cpp
std::error_code ec;
fs::remove("nonexistent", ec);
if (ec)
    std::cerr << "Error: " << ec.message();
```

## 常用函数

| 函数 | 说明 |
|------|------|
| `current_path()` | 当前工作目录 |
| `temp_directory_path()` | 临时目录 |
| `absolute(p)` | 转为绝对路径 |
| `canonical(p)` | 解析符号链接的绝对路径 |
| `equivalent(p1, p2)` | 是否指向同一文件 |
| `file_size(p)` | 文件大小 |
| `last_write_time(p)` | 最后修改时间 |

## 兼容性

需要 C++17 或更高版本，`<filesystem>` 可能与 `<experimental/filesystem>` 不同。编译时：

```bash
g++ -std=c++17 main.cpp -lstdc++fs
```

C++20 起不需要单独链接 `-lstdc++fs`。

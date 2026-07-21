# std::filesystem

C++17 引入 `std::filesystem`，提供跨平台的文件系统操作，封装了 POSIX 和 Windows API。

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

    p = p.replace_extension(".md");
    p = p.parent_path() / "new" / "file.txt";  // 拼接（推荐 / 运算符）
}
```

## 原理：path 的实现

`fs::path` 内部用 `std::string`（POSIX 格式）或 `std::wstring`（Windows 格式）存储路径，并提供迭代器逐段访问：

```cpp
// file.txt
for (const auto& part : p) {
    // "home" → "user" → "file.txt"
}

// 简要结构
class path {
    std::string path_;  // 始终以通用格式存储（/ 分隔）

    // 迭代器遍历各组件
    class iterator {
        const path* p_;
        size_t pos_;
        std::string component_;
    };
};
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

bool exists = fs::exists(p);
bool is_dir  = fs::is_directory(p);
bool is_file = fs::is_regular_file(p);
uintmax_t sz = fs::file_size(p);
auto ftime   = fs::last_write_time(p);

fs::copy(src, dst, fs::copy_options::overwrite_existing);
fs::rename(old, new);
fs::remove(path);
fs::remove_all(dir);
fs::create_directory(dir);
fs::create_directories("a/b/c");
fs::space_info si = fs::space("/");
```

## 原理：文件状态

`fs::file_status` 保存文件类型和权限，`status()` 查询文件状态，`symlink_status()` 不跟随符号链接：

```cpp
class file_status {
    file_type type;     // regular, directory, symlink, ...
    perms permissions;  // owner_read, owner_write, ...
};
```

底层调用 POSIX `stat()` / `lstat()` 系统调用：

```cpp
file_status status(const path& p) {
    struct stat st;
    if (::stat(p.c_str(), &st) == -1)
        // 处理错误
    return make_status(st);
}
```

## 错误处理

```cpp
std::error_code ec;
fs::remove("nonexistent", ec);
if (ec)
    std::cerr << "Error: " << ec.message();
```

无 `error_code` 重载会抛 `filesystem_error` 异常。

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

需要 C++17，编译：

```bash
g++ -std=c++17 main.cpp -lstdc++fs   # C++17
g++ -std=c++20 main.cpp               # C++20 起无需单独链接
```

# Hello World

第一个 C++ 程序。

```cpp
#include <iostream>

int main() {
    std::cout << "Hello, World!" << std::endl;
}
```

编译运行：

```bash
g++ hello.cpp -o hello
./hello
```

## 说明

- `#include <iostream>` — 引入输入输出流头文件
- `int main()` — 程序入口函数，C++ 标准规定 main 函数省略 `return 0;` 时会隐式返回 0，所以无需显式写出
- `std::cout << ...` — 输出到控制台（`std::` 是命名空间前缀，标准库所有名称都在此空间下）
- `std::endl` — 换行并刷新缓冲区

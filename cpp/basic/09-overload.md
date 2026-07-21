# 函数重载与默认参数

## 函数重载

C++ 允许同名函数拥有不同的参数列表（参数个数或类型不同）。

```cpp
int max(int a, int b) {
    return a > b ? a : b;
}

double max(double a, double b) {
    return a > b ? a : b;
}

int max(int a, int b, int c) {
    return max(max(a, b), c);
}

int main() {
    std::cout << max(3, 7) << std::endl;        // 调用 int 版本
    std::cout << max(3.5, 2.1) << std::endl;    // 调用 double 版本
    std::cout << max(1, 5, 3) << std::endl;     // 调用三个参数版本
}
```

## 默认参数

可以在声明时给参数指定默认值。

```cpp
void greet(std::string name, std::string prefix = "Hello") {
    std::cout << prefix << ", " << name << "!" << std::endl;
}

greet("Alice");              // Hello, Alice!
greet("Bob", "Hi");          // Hi, Bob!
```

注意：默认参数必须从右向左连续指定。

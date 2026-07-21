# 封装

封装通过访问权限隐藏内部实现，只暴露必要接口。

## getter / setter

```cpp
#include <iostream>
#include <string>

class BankAccount {
private:
    std::string owner;
    double balance;

public:
    BankAccount(std::string o, double b) : owner(o), balance(b) {}

    std::string getOwner() const { return owner; }

    double getBalance() const { return balance; }

    void deposit(double amount) {
        if (amount > 0) {
            balance += amount;
        }
    }

    bool withdraw(double amount) {
        if (amount > 0 && amount <= balance) {
            balance -= amount;
            return true;
        }
        return false;
    }
};

int main() {
    BankAccount acc("Alice", 1000);
    acc.deposit(500);
    acc.withdraw(200);
    std::cout << acc.getOwner() << ": " << acc.getBalance() << std::endl;
}
```

## const 成员函数

在函数声明后加 `const`，表示该函数不修改成员变量：

```cpp
double getBalance() const { return balance; }
```

只有 `const` 成员函数可以被 `const` 对象调用。

### 原理

`const` 成员函数的 `this` 指针类型是 `const T*`，而非 `T*`：

```cpp
// 编译器视为
double getBalance(const BankAccount* this) {
    return this->balance;
}
```

### const 重载

`const` 和非 `const` 版本可以共存，根据对象是否 const 选择：

```cpp
struct Vector {
    int& operator[](size_t i) { return data[i]; }

    const int& operator[](size_t i) const { return data[i]; }
};

Vector v;
v[0] = 1;          // 非 const 版本，可写

const Vector cv;
// cv[0] = 1;      // 错误
int x = cv[0];      // const 版本，只读
```

### 设计原则

- 不修改对象的成员函数应标记 `const`
- 是接口契约的一部分："调用此函数不会改变对象可见状态"

## mutable

`mutable` 允许成员变量在 `const` 函数中被修改，常用于缓存、引用计数、互斥锁。

```cpp
struct Cache {
    int compute(int key) const {
        auto it = cache_.find(key);
        if (it != cache_.end())
            return it->second;
        int val = expensive_compute(key);
        cache_[key] = val;   // 修改 mutable 成员
        return val;
    }

private:
    mutable std::map<int, int> cache_;
    int expensive_compute(int k) const { /* ... */ }
};
```

注意：`mutable` 打破 const 语义，仅在缓存、线程安全等场景谨慎使用。

## 用户定义转换

类可以定义到其他类型的隐式或显式转换：

```cpp
struct Fraction {
    int num, den;

    operator double() const {
        return static_cast<double>(num) / den;
    }

    explicit operator bool() const {
        return den != 0;
    }
};

Fraction f{3, 4};
double d = f;
// if (f)
// int x = f;  // 错误
```

`explicit` 转换只在 `if`、`while`、`!` 等语境隐式触发。

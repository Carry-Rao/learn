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

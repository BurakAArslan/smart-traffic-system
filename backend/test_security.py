from src.auth.security import hash_password, verify_password

password = "123456"

hashed = hash_password(password)
print("Hash:", hashed)

result = verify_password("123456", hashed)
print("Doğrulama Sonucu:", result)
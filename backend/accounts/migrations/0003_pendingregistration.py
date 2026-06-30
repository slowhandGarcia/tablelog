from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("accounts", "0002_loginattempt"),
    ]

    operations = [
        migrations.CreateModel(
            name="PendingRegistration",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("email", models.EmailField(unique=True)),
                ("username", models.CharField(max_length=150)),
                ("password_hash", models.CharField(max_length=128)),
                ("token", models.CharField(db_index=True, max_length=100, unique=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("expires_at", models.DateTimeField()),
            ],
        ),
    ]

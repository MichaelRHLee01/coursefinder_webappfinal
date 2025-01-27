# Generated by Django 5.1.1 on 2024-11-13 15:58

from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('course', '0004_alter_vote_unique_together'),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.RemoveField(
            model_name='course',
            name='description',
        ),
        migrations.AddField(
            model_name='course',
            name='number',
            field=models.CharField(default='0', max_length=20, unique=True),
        ),
        migrations.AlterUniqueTogether(
            name='vote',
            unique_together={('course', 'user')},
        ),
    ]

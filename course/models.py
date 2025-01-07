from django.db import models
from django.contrib.auth.models import User

class Course(models.Model):
  number = models.CharField(max_length=20, unique=True, default='0')
  name = models.CharField(max_length=255)
  average_credit_hours = models.FloatField(default=0)
  created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)

  def calculate_average_rating(self):
    votes = Vote.objects.filter(course=self)
    if votes.exists():
      avg = sum(vote.rating for vote in votes)/votes.count()
      return f"{avg:.1f}"
    return 0

  def __str__(self):
    return self.name

class Vote(models.Model):
  user = models.ForeignKey(User, on_delete=models.CASCADE, null=True)
  rating = models.PositiveIntegerField() 
  course = models.ForeignKey(Course, on_delete=models.CASCADE)

  class Meta:
    unique_together = ('course', 'user')

  def __str__(self):
    return f"{self.user.username} rated {self.course.name} with {self.rating}"
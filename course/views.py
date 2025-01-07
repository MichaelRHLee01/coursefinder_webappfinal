from django.shortcuts import render
from django.shortcuts import get_object_or_404
from django.contrib.auth.decorators import login_required
from django.http import JsonResponse
from course.models import Course, Vote
from django.contrib.auth.decorators import user_passes_test
from django.db.models import Avg, Value
from django.db.models.functions import Coalesce
from django.shortcuts import render, redirect
from django.contrib.auth import logout



@login_required
def home_view(request):
  if request.method == "GET":
    courses = Course.objects.annotate(
        avg_rating=Avg('vote__rating')
    ).order_by(Coalesce('avg_rating', Value(999)))

    course_data = [
       {
          'id': course.id,
          'number': course.number,
          'name': course.name,
          'average_rating': course.calculate_average_rating(),
          'average_credit_hours': course.average_credit_hours,
       }
       for course in courses
    ]

    return render(request, 'course/home.html', {'courses': course_data})
  
  elif request.method == "POST":
        course_number = request.POST.get('course_number')
        course_name = request.POST.get('course_name')
        hours_per_week = request.POST.get('hours_per_week')

        message = "Course added successfully!"
        # Create course
        if not Course.objects.filter(number=course_number).exists():
          course = Course.objects.create(
              number=course_number,
              name=course_name,
              average_credit_hours=hours_per_week
          )
        else:
          message = f"Course number {course_number} already exists. Please choose a different course number."

        courses = Course.objects.all()
        course_data = [
          {
            'id': course.id,
            'number': course.number,
            'name': course.name,
            'average_rating': course.calculate_average_rating(),
            'average_credit_hours': course.average_credit_hours,
          }
          for course in courses
        ]

        return render(request, 'course/home.html', {'courses': course_data, 'message': message})
  
@login_required
def add_course(request):
  if request.method == "POST":
    course_number = request.POST.get("course_number")
    course_name = request.POST.get("course_name")
    credit_hours = request.POST.get("hours_per_week")

    formatted_number = f"{course_number[:2]}-{course_number[2:]}"

    new_course = Course(number=formatted_number, name=course_name, average_credit_hours=float(credit_hours))
    new_course.save()

    course_data = {
      'id': new_course.id,
      'number': formatted_number,
      'name': new_course.name,
      'average_credit_hours': new_course.average_credit_hours,
      'average_rating': 0
    }

    return JsonResponse([course_data], safe=False)

def login_page(request):
    if request.user.is_authenticated:
        return redirect('home')
    return render(request, 'course/login_page.html')

def logout_view(request):
    logout(request)
    return redirect('login')



from django.shortcuts import get_object_or_404
from django.http import JsonResponse
from .models import Course, Vote

@login_required
def submit_vote(request):
    if request.method == "POST":
        course_id = request.POST.get("course_id")
        rating = int(request.POST.get("rating"))

        course = get_object_or_404(Course, id=course_id)

        Vote.objects.create(
            user=request.user,
            course=course,
            rating=rating
        )

        average_rating = course.calculate_average_rating()

        return JsonResponse({
            'course_id': course.id,
            'average_rating': average_rating
        })

def course_rating_distribution(request, course_id):
    hour_ranges = [(i, i + 1) for i in range(25)]
    
    distribution = {f"{start}-{end}": 0 for start, end in hour_ranges}
    course = get_object_or_404(Course, id=course_id)

    for start, end in hour_ranges:
        count = Vote.objects.filter(course=course, rating__gte=start, rating__lt=end).count()
        distribution[f"{start}-{end}"] = count

    return JsonResponse(distribution)

def is_admin(user):
   return user.is_staff

@user_passes_test(is_admin)
def delete_course(request, course_id):
   if request.method == "POST":
      course = get_object_or_404(Course, id=course_id)
      course.delete()
      return JsonResponse({'status': 'success'})
   
   
@user_passes_test(is_admin)
def delete_vote(request, vote_id):
   if request.method == "POST":
      vote = get_object_or_404(Vote, id="vote_id")
      course = vote.course
      vote.delete()
      return JsonResponse({
         'status': 'success',
         'course_id': course.id,
         'average_rating': course.calculate_average_rating()
      })
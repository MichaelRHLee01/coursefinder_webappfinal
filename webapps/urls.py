"""
URL configuration for webapps project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/5.1/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include
from course import views

urlpatterns = [
    path('', views.home_view, name='home'),
    path('login/', views.login_page, name='login'),
    path('logout/', views.logout_view, name='logout'),
    path('oauth/', include('social_django.urls', namespace='social')),
    path('course/add-course', views.add_course, name='add_course'),
    path('course/submit-vote', views.submit_vote, name='submit_vote'),
    path('course/<int:course_id>/rating-distribution/', views.course_rating_distribution, name='rating-distribution'),
    path('course/<int:course_id>/delete/', views.delete_course, name='delete_course'),
    path('vote/<int:vote_id>/delete/', views.delete_vote, name='delete_vote'),
    path('admin/', admin.site.urls),
]

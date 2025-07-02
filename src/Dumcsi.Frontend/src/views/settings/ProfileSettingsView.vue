<template>
  <!-- Main container matching the LoginView's gradient background -->
  <div class="flex-1 p-4 sm:p-8 bg-gray-900 text-white overflow-y-auto">
    <div class="max-w-4xl mx-auto">
      
      <!-- Page Header -->
      <header class="mb-8 flex items-center space-x-4">
        <div class="flex-shrink-0 flex items-center justify-center w-12 h-12 bg-primary/20 rounded-xl">
            <UserCircle class="w-7 h-7 text-primary" />
        </div>
        <div>
            <h1 class="text-3xl font-bold tracking-tight">User Settings</h1>
            <p class="mt-1 text-sm text-gray-400">Manage your account and preferences</p>
        </div>
      </header>

      <!-- Profile Information Section Card -->
      <div class="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden mb-8">
        <form @submit.prevent="updateProfile">
          <!-- Card Header -->
          <div class="p-6 border-b border-gray-700/50">
            <h2 class="text-lg font-semibold leading-6">Profile Information</h2>
            <p class="mt-1 text-sm text-gray-400">This information may be visible to other users.</p>
          </div>
          
          <!-- Card Body -->
          <div class="p-6 space-y-6">
            <!-- Avatar -->
            <div class="flex items-center gap-x-5">
                <img class="h-20 w-20 rounded-full object-cover border-2 border-gray-600" :src="authStore.user?.avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${profileForm.username || 'default'}`" alt="Current avatar">
                <div>
                    <button type="button" class="btn-secondary">
                        Change Avatar
                    </button>
                    <p class="text-xs text-gray-400 mt-2">PNG, JPG, GIF up to 5MB.</p>
                </div>
            </div>

            <!-- Form Fields -->
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                    <label for="username" class="form-label">Username</label>
                    <input v-model="profileForm.username" type="text" id="username" class="form-input" />
                    <p v-if="errors.username" class="form-error">{{ errors.username }}</p>
                </div>
                <div>
                    <label for="email" class="form-label">Email Address</label>
                    <input v-model="profileForm.email" type="email" id="email" class="form-input" />
                    <p v-if="errors.email" class="form-error">{{ errors.email }}</p>
                </div>
            </div>
          </div>
          
          <!-- Card Footer with Actions -->
          <div class="bg-gray-900/40 px-6 py-4 flex items-center justify-between">
            <transition name="fade">
              <p v-if="successMessage" class="text-sm font-medium text-green-400">
                ✓ {{ successMessage }}
              </p>
            </transition>
            <button :disabled="isLoading" type="submit" class="btn-primary ml-auto">
              <span v-if="!isLoading">Save Changes</span>
              <span v-else class="flex items-center">
                <Loader2 class="animate-spin -ml-1 mr-2 h-5 w-5" />
                Saving...
              </span>
            </button>
          </div>
        </form>
      </div>

      <!-- Password Change Section Card -->
      <div class="bg-gray-800/50 backdrop-blur-md rounded-2xl shadow-2xl border border-gray-700/50 overflow-hidden">
         <form @submit.prevent="updatePassword">
            <div class="p-6 border-b border-gray-700/50">
               <h2 class="text-lg font-semibold leading-6">Change Password</h2>
               <p class="mt-1 text-sm text-gray-400">For your security, we recommend using a strong password.</p>
            </div>
            <div class="p-6 space-y-6">
                <div>
                   <label for="current-password" class="form-label">Current Password</label>
                   <input type="password" id="current-password" class="form-input" placeholder="••••••••" />
                </div>
                <div>
                   <label for="new-password" class="form-label">New Password</label>
                   <input type="password" id="new-password" class="form-input" placeholder="••••••••" />
                </div>
            </div>
            <div class="bg-gray-900/40 px-6 py-4 flex justify-end">
               <button type="submit" class="btn-primary">Update Password</button>
            </div>
         </form>
      </div>

    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue';
import { useAuthStore } from '@/stores/auth';
import { UserCircle, Loader2 } from 'lucide-vue-next';
// import userService from '@/services/userService'; 

// --- STATE MANAGEMENT ---
const authStore = useAuthStore();
const profileForm = reactive({
  username: '',
  email: ''
});

const isLoading = ref(false);
const successMessage = ref('');
const errors = reactive({});

// --- LIFECYCLE HOOKS ---
onMounted(() => {
  if (authStore.user) {
    profileForm.username = authStore.user.username;
    // In a real app, you would fetch the email from your API
    // For now, we simulate it.
    profileForm.email = 'user@example.com'; 
  }
});

// --- METHODS ---
const clearMessages = () => {
  successMessage.value = '';
  Object.keys(errors).forEach(key => delete errors[key]);
};

const updateProfile = async () => {
  clearMessages();
  isLoading.value = true;
  
  try {
    // Simulate API call latency
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // In a real application:
    // await userService.updateProfile(profileForm);

    // Handle success
    successMessage.value = 'Profile updated successfully!';
    setTimeout(() => successMessage.value = '', 3000);

  } catch (error) {
    console.error('Error updating profile:', error);
    // Example of how to handle validation errors from a backend
    if (error?.response?.status === 422) {
      Object.assign(errors, error.response.data.errors);
    } else {
      errors.general = 'An unexpected error occurred. Please try again.';
    }
  } finally {
    isLoading.value = false;
  }
};

const updatePassword = () => {
  // Logic for updating password would go here
  alert('Password update functionality is a placeholder.');
};
</script>

<style scoped>

@reference "@/style.css";

.form-label {
  @apply block text-sm font-medium text-gray-300 mb-2;
}

.form-input {
  @apply w-full px-4 py-3 bg-gray-700/50 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-primary/50 focus:border-transparent transition;
}

.form-error {
    @apply mt-1 text-xs text-red-400;
}

.btn-primary {
  @apply inline-flex justify-center items-center py-2.5 px-5 bg-primary hover:bg-primary-hover disabled:bg-primary/50 text-white font-semibold rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-primary disabled:scale-100 disabled:cursor-not-allowed;
}

.btn-secondary {
  @apply inline-flex justify-center items-center py-2 px-4 bg-gray-700/60 border border-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition-colors duration-200;
}

/* Fade animation for the success message */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>

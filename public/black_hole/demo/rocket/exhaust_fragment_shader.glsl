
uniform vec3 camera;

uniform vec3 intensity;
uniform vec3 k_r;
uniform vec3 k_z;

in vec3 position;

layout(location = 0) out vec4 frag_color;

void main() {
  frag_color = vec4(0.0);

  vec3 dir = normalize(position - camera);
  float a = dot(dir.xy, dir.xy);
  float b = dot(camera.xy, dir.xy);
  float c = dot(camera.xy, camera.xy);
  float discriminant = b * b - a * (c - RADIUS * RADIUS);
  if (discriminant >= 0.0) {
    float t_min = max((-b - sqrt(discriminant)) / a, 0.0);
    float t_max = (-b + sqrt(discriminant)) / a;
    if (dir.z > 0.0) {
      t_min = max(t_min, (Z_MIN - camera.z) / dir.z);
      t_max = min(t_max, (Z_MAX - camera.z) / dir.z);
    } else {
      t_min = max(t_min, (Z_MAX - camera.z) / dir.z);
      t_max = min(t_max, (Z_MIN - camera.z) / dir.z);
    }
    if (t_min < t_max) {
      const int N = 16;
      vec3 emitted = vec3(0.0);
      float dt = (t_max - t_min) / float(N);
      float t = t_min + 0.5 * dt;
      // TODO(me): use analytic indefinite integral instead?
      for (int i = 0; i < N; ++i) {
        float r2 = ((a * t + 2.0 * b) * t) + c;
        float z = camera.z + t * dir.z;
        emitted += exp(- k_r * r2 - k_z * (Z_MAX - z));
        t += dt;
      }
      frag_color = vec4(intensity * emitted * dt, 0.0);
    }
  }
}


uniform vec3 camera_size;

layout(location = 0) in vec4 vertex;

out vec3 view_dir;

void main() {
  view_dir = vec3(vertex.xy * camera_size.xy, -camera_size.z);
  gl_Position = vertex;
}
